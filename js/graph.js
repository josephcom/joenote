/* JoeNote - js/graph.js
 * The hashtag map: an SVG drawing of the tag ontology, laid out as a tree.
 * Every tag is a rectangle with its own hashtag written inside it.
 * Solid arrows point parent -> child. Dashed arcs join siblings.
 *
 * The map used to be a force simulation, and read like one: boxes drifted
 * wherever the springs left them, arrows crossed, and the same ontology
 * looked different every time it was opened. It is a hierarchy, so it is
 * now drawn as one - rows from the top down, in the same places every time.
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    return node;
  }

  function Graph(svg, opts) {
    this.svg = svg;
    this.opts = opts || {};
    this.nodes = [];
    this.index = Object.create(null);
    this.links = [];
    this.rows = [];
    this.view = { x: 0, y: 0, k: 1 };
    this.selected = null;
    this.highlight = Object.create(null);
    this.running = false;
    this.build();
    this.bindEvents();
  }

  Graph.prototype.build = function () {
    var svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var defs = el('defs');
    ['arrow', 'arrow-hi'].forEach(function (id) {
      var marker = el('marker', {
        id: id, viewBox: '0 0 10 10', refX: 10, refY: 5,
        markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'
      });
      marker.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', 'class': id === 'arrow' ? 'arrowhead' : 'arrowhead hi' }));
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    this.root = el('g', { 'class': 'graph-root' });
    this.linkLayer = el('g', { 'class': 'links' });
    this.nodeLayer = el('g', { 'class': 'nodes' });
    this.root.appendChild(this.linkLayer);
    this.root.appendChild(this.nodeLayer);
    svg.appendChild(this.root);
  };

  /* ---------------- data ---------------- */

  Graph.prototype.setData = function (tagMap) {
    var self = this;
    var names = Object.keys(tagMap).sort();
    var old = this.index;
    var hadAny = this.nodes.length > 0;
    this.nodes = [];
    this.index = Object.create(null);

    names.forEach(function (name) {
      var prev = old[name];
      var node = {
        name: name,
        count: tagMap[name].count || 0,
        /* a tag that was already on the map keeps its place until the new
           layout is worked out, and then slides to it */
        x: prev ? prev.x : 0,
        y: prev ? prev.y : 0,
        placed: !!prev,
        fixed: false,
        /* a placeholder box, so the layout has sizes to work with even if it
           is asked to run before the first measurement */
        w: 60, h: 24, hw: 30, hh: 12, measured: false
      };
      self.nodes.push(node);
      self.index[name] = node;
    });

    this.links = [];
    names.forEach(function (name) {
      var rec = tagMap[name];
      /* a hashtag nobody hangs off is a root of the ontology, and is painted
         green so the tops of the tree can be picked out at a glance */
      self.index[name].root = Object.keys(rec.parents).length === 0;
      Object.keys(rec.parents).sort().forEach(function (p) {
        if (self.index[p]) self.links.push({ a: self.index[p], b: self.index[name], kind: 'parent', bend: [] });
      });
      Object.keys(rec.siblings).sort().forEach(function (s) {
        if (self.index[s] && name < s) self.links.push({ a: self.index[name], b: self.index[s], kind: 'sibling', bend: [] });
      });
    });

    this.render();
    this.layout(hadAny);
  };

  Graph.prototype.width = function () { return this.svg.clientWidth || this.svg.getBoundingClientRect().width; };
  Graph.prototype.height = function () { return this.svg.clientHeight || this.svg.getBoundingClientRect().height; };

  /* ---------------- box geometry ---------------- */

  var PAD_X = 11, PAD_Y = 6;

  /* the box is as big as the word it holds; the busier tags get a little more
     type, which is the only thing left to size them by */
  Graph.prototype.fontSize = function (n) {
    return 11.5 + Math.min(5, Math.sqrt(n.count) * 1.2);
  };

  /* Text can only be measured once it is on screen, and the map is built
     hidden whenever a note is deep-linked. So guess from the character count
     and take the real reading the first time the map is given a size. */
  Graph.prototype.measure = function (n) {
    var fs = this.fontSize(n);
    var w = 0;
    if (n.label && this.width()) {
      try { w = n.label.getComputedTextLength(); } catch (e) { w = 0; }
    }
    n.measured = w > 0;
    if (!w) w = ('#' + n.name).length * fs * 0.58;
    n.w = Math.round(w + PAD_X * 2);
    n.h = Math.round(fs + PAD_Y * 2);
    n.hw = n.w / 2;
    n.hh = n.h / 2;
  };

  /* where a line leaving n's centre in direction (dx, dy) crosses its border */
  function edge(n, dx, dy, pad) {
    var hw = n.hw + pad, hh = n.hh + pad;
    var sx = dx ? hw / Math.abs(dx) : Infinity;
    var sy = dy ? hh / Math.abs(dy) : Infinity;
    var s = Math.min(sx, sy);
    return { x: dx * s, y: dy * s };
  }

  /* ---------------- layout ----------------
   * Every hashtag sits on the row below its deepest parent. That puts the
   * parentless green tags on one line along the top, and hangs the rest of
   * the ontology underneath them, arrows always pointing down the page.
   *
   * Widths look after themselves: a row is packed left to right with a fixed
   * gap, so a tag with a lot of branches under it takes up a lot of the row
   * and the next trunk starts after them, however many there are.
   *
   * Tags with two or more parents are the awkward case, and get two things:
   * the row is ordered to untangle their arrows, and their x is pulled to the
   * average of everything they hang from, so they settle between their
   * parents instead of under one of them. An arrow that has to cross a row on
   * the way down is routed through an invisible waypoint on that row, which
   * keeps it in the gutter between boxes rather than across their faces.
   */

  var GAP_X = 24;    /* clear air between two boxes on the same row */
  var ROW_GAP = 58;  /* clear air between one row and the next */

  Graph.prototype.layout = function (animate) {
    var self = this, i, j;
    if (!this.nodes.length) { this.rows = []; this.paint(); return; }
    /* where each box is now, kept aside: the working out below overwrites x
       and y, and the slide at the end has to start from where the eye last
       saw them */
    this.nodes.forEach(function (n) {
      if (!n.measured) self.measure(n);
      n.px = n.x; n.py = n.y;
    });

    var tree = this.links.filter(function (l) { return l.kind === 'parent'; });

    /* -- 1. rows: the longest path down from any root ------------------ */
    var kids = Object.create(null), pars = Object.create(null);
    this.nodes.forEach(function (n) { kids[n.name] = []; pars[n.name] = []; n.row = 0; });
    tree.forEach(function (l) { kids[l.a.name].push(l.b); pars[l.b.name].push(l.a); });

    var indeg = Object.create(null), queue = [], order = [];
    this.nodes.forEach(function (n) {
      indeg[n.name] = pars[n.name].length;
      if (!indeg[n.name]) queue.push(n);
    });
    while (queue.length) {
      var n = queue.shift();
      order.push(n);
      kids[n.name].forEach(function (c) {
        if (c.row < n.row + 1) c.row = n.row + 1;
        if (--indeg[c.name] === 0) queue.push(c);
      });
    }
    /* tags.xml is kept acyclic, but never trust the file: anything left over
       is dropped on the row below its deepest known parent and carries on */
    if (order.length < this.nodes.length) {
      this.nodes.forEach(function (n) {
        if (order.indexOf(n) === -1) {
          pars[n.name].forEach(function (p) { if (n.row <= p.row) n.row = p.row + 1; });
          order.push(n);
        }
      });
    }

    /* -- 2. cells: the real boxes plus waypoints for long arrows -------- */
    var rows = [];
    function row(i) { return rows[i] || (rows[i] = []); }
    this.nodes.forEach(function (n) {
      n.up = []; n.down = []; n.kidsT = []; n.cellW = n.hw;
      row(n.row).push(n);
    });
    function join(a, b) { a.down.push(b); b.up.push(a); }
    tree.forEach(function (l) {
      l.bend = [];
      var prev = l.a;
      for (var r = l.a.row + 1; r < l.b.row; r++) {
        var d = { dummy: true, row: r, x: 0, y: 0, hw: 0, hh: 0, cellW: 5, up: [], down: [], kidsT: [] };
        row(r).push(d);
        l.bend.push(d);
        join(prev, d);
        prev = d;
      }
      join(prev, l.b);
    });
    for (i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    this.rows = rows;

    /* -- 3. order within each row: a tidy first guess, then untangling -- */
    var seen = [], fresh = [];
    for (i = 0; i < rows.length; i++) fresh[i] = [];
    function walk(c) {
      if (seen.indexOf(c) !== -1) return;
      seen.push(c);
      fresh[c.row].push(c);
      c.down.slice().sort(byName).forEach(walk);
    }
    function byName(a, b) {
      return String(a.name || '~').localeCompare(String(b.name || '~'));
    }
    rows[0].slice().sort(byName).forEach(walk);
    for (i = 0; i < rows.length; i++) {
      rows[i].forEach(function (c) { if (fresh[c.row].indexOf(c) === -1) fresh[c.row].push(c); });
      rows[i] = fresh[i];
    }
    stamp(rows);

    function stamp(rs) {
      for (var a = 0; a < rs.length; a++) for (var b = 0; b < rs[a].length; b++) rs[a][b].ord = b;
    }
    function median(list) {
      if (!list.length) return -1;
      var v = list.map(function (c) { return c.ord; }).sort(function (p, q) { return p - q; });
      var m = v.length >> 1;
      return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
    }
    function crossings(rs) {
      var total = 0;
      for (var r = 1; r < rs.length; r++) {
        var pairs = [];
        rs[r].forEach(function (c) { c.up.forEach(function (u) { pairs.push([u.ord, c.ord]); }); });
        for (var a = 0; a < pairs.length; a++)
          for (var b = a + 1; b < pairs.length; b++)
            if ((pairs[a][0] - pairs[b][0]) * (pairs[a][1] - pairs[b][1]) < 0) total++;
      }
      return total;
    }
    function sweep(rs, downward) {
      var from = downward ? 1 : rs.length - 2;
      var to = downward ? rs.length : -1;
      var step = downward ? 1 : -1;
      for (var r = from; r !== to; r += step) {
        var keys = [];
        rs[r].forEach(function (c) {
          var m = median(downward ? c.up : c.down);
          keys.push({ c: c, k: m < 0 ? c.ord : m });
        });
        keys.sort(function (p, q) { return p.k - q.k; });
        rs[r] = keys.map(function (p) { return p.c; });
        stamp(rs);
      }
    }
    var best = rows.map(function (r) { return r.slice(); }), bestCost = crossings(rows);
    for (i = 0; i < 12 && bestCost > 0; i++) {
      sweep(rows, i % 2 === 0);
      var cost = crossings(rows);
      if (cost < bestCost) { bestCost = cost; best = rows.map(function (r) { return r.slice(); }); }
    }
    rows = this.rows = best;
    stamp(rows);

    /* -- 4. x: hang each branch under its parent, then even it out ------ */
    var roots = rows[0].slice();
    rows.forEach(function (r) {
      r.forEach(function (c) {
        if (!c.up.length) { if (c.row > 0) roots.push(c); return; }
        /* one parent is picked to hang from - the middle one, so a tag with
           three parents starts under the middle of them */
        var ups = c.up.slice().sort(function (p, q) { return p.ord - q.ord; });
        ups[(ups.length - 1) >> 1].kidsT.push(c);
      });
    });
    rows.forEach(function (r) {
      r.forEach(function (c) { c.kidsT.sort(function (p, q) { return p.ord - q.ord; }); });
    });

    var ledger = [];
    function place(c) {
      if (!c.kidsT.length) {
        c.x = Math.max(ledger[c.row] === undefined ? c.cellW : ledger[c.row] + c.cellW, c.cellW);
      } else {
        c.kidsT.forEach(place);
        var mid = (c.kidsT[0].x + c.kidsT[c.kidsT.length - 1].x) / 2;
        var min = Math.max(ledger[c.row] === undefined ? c.cellW : ledger[c.row] + c.cellW, c.cellW);
        c.x = Math.max(mid, min);
        /* if the row above pushed the parent past the middle of its children,
           the whole branch moves with it rather than leaning */
        if (c.x > mid + 0.01) c.kidsT.forEach(function (k) { shift(k, c.x - mid); });
      }
      ledger[c.row] = c.x + c.cellW + GAP_X;
    }
    function shift(c, dx) {
      c.x += dx;
      if (ledger[c.row] === undefined || c.x + c.cellW + GAP_X > ledger[c.row]) ledger[c.row] = c.x + c.cellW + GAP_X;
      c.kidsT.forEach(function (k) { shift(k, dx); });
    }
    roots.sort(function (p, q) { return p.row - q.row || p.ord - q.ord; }).forEach(place);

    /* the order in each row is now whatever the placement made of it */
    rows.forEach(function (r) { r.sort(function (p, q) { return p.x - q.x; }); });
    stamp(rows);

    function separate(r) {
      var i, min, max;
      for (i = 1; i < r.length; i++) {
        min = r[i - 1].x + r[i - 1].cellW + r[i].cellW + GAP_X;
        if (r[i].x < min) r[i].x = min;
      }
      for (i = r.length - 2; i >= 0; i--) {
        max = r[i + 1].x - r[i + 1].cellW - r[i].cellW - GAP_X;
        if (r[i].x > max) r[i].x = max;
      }
      for (i = 1; i < r.length; i++) {  /* the pass back left can undo the first; settle it */
        min = r[i - 1].x + r[i - 1].cellW + r[i].cellW + GAP_X;
        if (r[i].x < min) r[i].x = min;
      }
    }
    function pull(rs, downward) {
      var from = downward ? 1 : rs.length - 2;
      var to = downward ? rs.length : -1;
      var step = downward ? 1 : -1;
      for (var r = from; r !== to; r += step) {
        rs[r].forEach(function (c) {
          var near = downward ? c.up : c.down;
          if (!near.length) return;
          var sum = 0;
          near.forEach(function (o) { sum += o.x; });
          c.x += (sum / near.length - c.x) * 0.6;
        });
        separate(rs[r]);
      }
    }
    for (i = 0; i < 8; i++) { pull(rows, true); pull(rows, false); }
    rows.forEach(separate);

    /* -- 4b. push the separate trees back together --------------------
     * Nothing joins one tree to the next, so nothing stops them drifting
     * apart. A deep tree pulls its own root sideways as the branches under
     * it spread, while the tree beside it stays where it was first put, and
     * the two end up with a page of empty grid between them - which is how
     * #mind came to sit alone in a corner. So each tree is slid left until
     * it is one gap clear of everything already placed, row by row: as close
     * as it can go without two boxes touching. Nothing inside a tree moves,
     * so its own shape survives the journey. */
    var cid = Object.create(null), groups = [], adj = Object.create(null);
    this.nodes.forEach(function (n) { cid[n.name] = -1; adj[n.name] = []; });
    /* only parent edges make a tree; a dashed sibling line joins two tags
       that may live at opposite ends of the map, and dragging one tree
       against the other to shorten it would open a far worse hole */
    tree.forEach(function (l) { adj[l.a.name].push(l.b.name); adj[l.b.name].push(l.a.name); });
    this.nodes.forEach(function (n) {
      if (cid[n.name] !== -1) return;
      var id = groups.length, stack = [n.name], cells = [];
      cid[n.name] = id;
      while (stack.length) {
        var cur = stack.pop();
        cells.push(self.index[cur]);
        adj[cur].forEach(function (m) { if (cid[m] === -1) { cid[m] = id; stack.push(m); } });
      }
      groups.push({ cells: cells });
    });
    /* a waypoint travels with the tree whose arrow it belongs to */
    tree.forEach(function (l) {
      if (!l.bend.length) return;
      var g = groups[cid[l.a.name]];
      l.bend.forEach(function (d) { g.cells.push(d); });
    });

    groups.forEach(function (g) {
      g.left = Infinity;
      g.cells.forEach(function (c) { g.left = Math.min(g.left, c.x - c.cellW); });
    });
    var skyline = [];
    groups.slice().sort(function (p, q) { return p.left - q.left; }).forEach(function (g) {
      var edgeOf = [], move = -Infinity, r;
      g.cells.forEach(function (c) {
        if (edgeOf[c.row] === undefined || c.x - c.cellW < edgeOf[c.row]) edgeOf[c.row] = c.x - c.cellW;
      });
      for (r = 0; r < edgeOf.length; r++) {
        if (edgeOf[r] === undefined) continue;
        move = Math.max(move, (skyline[r] === undefined ? 0 : skyline[r] + GAP_X) - edgeOf[r]);
      }
      if (move === -Infinity) move = 0;
      g.cells.forEach(function (c) {
        c.x += move;
        if (skyline[c.row] === undefined || c.x + c.cellW > skyline[c.row]) skyline[c.row] = c.x + c.cellW;
      });
    });

    rows.forEach(function (r) { r.sort(function (p, q) { return p.x - q.x; }); });
    stamp(rows);
    rows.forEach(separate);

    /* -- 5. y: one row under the next, each as tall as its tallest box -- */
    var y = 0;
    for (i = 0; i < rows.length; i++) {
      var tallest = 0;
      rows[i].forEach(function (c) { tallest = Math.max(tallest, c.hh); });
      if (i) y += ROW_GAP + tallest;
      rows[i].forEach(function (c) { c.ty = y; });
      y += tallest;
    }

    /* -- 6. move everything there ------------------------------------- */
    var minX = Infinity;
    rows.forEach(function (r) { r.forEach(function (c) { minX = Math.min(minX, c.x - c.cellW); }); });
    rows.forEach(function (r) {
      r.forEach(function (c) {
        c.tx = c.x - minX;
        if (c.dummy) { c.x = c.tx; c.y = c.ty; }
      });
    });

    /* a hashtag that has just appeared has nowhere to slide from, so it is
       simply already where it belongs */
    this.nodes.forEach(function (n) {
      if (!n.placed) { n.px = n.tx; n.py = n.ty; n.placed = true; }
    });
    if (animate) this.glide(); else {
      this.nodes.forEach(function (n) { n.x = n.tx; n.y = n.ty; });
      this.paint();
    }
  };

  /* Nothing jumps: after a re-layout every box slides from where it was to
     where it now belongs, so the eye can follow what moved. */
  Graph.prototype.glide = function () {
    var self = this;
    this.nodes.forEach(function (n) { n.x = n.px; n.y = n.py; });
    this.running = false;
    requestAnimationFrame(function () {
      var t0 = null;
      self.running = true;
      requestAnimationFrame(function step(ts) {
        if (!self.running) return;
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / 420);
        var e = 1 - Math.pow(1 - t, 3);
        self.nodes.forEach(function (n) {
          if (n.fixed) return;
          n.x = n.px + (n.tx - n.px) * e;
          n.y = n.py + (n.ty - n.py) * e;
        });
        self.paint();
        if (t >= 1) { self.running = false; return; }
        requestAnimationFrame(step);
      });
    });
  };

  Graph.prototype.relayout = function () {
    this.nodes.forEach(function (n) { n.fixed = false; });
    this.layout(true);
  };

  /* ---------------- rendering ---------------- */

  Graph.prototype.render = function () {
    var self = this;
    while (this.linkLayer.firstChild) this.linkLayer.removeChild(this.linkLayer.firstChild);
    while (this.nodeLayer.firstChild) this.nodeLayer.removeChild(this.nodeLayer.firstChild);

    this.links.forEach(function (l) {
      l.el = el('path', {
        'class': 'link ' + l.kind,
        fill: 'none',
        'marker-end': l.kind === 'parent' ? 'url(#arrow)' : null
      });
      self.linkLayer.appendChild(l.el);
    });

    this.nodes.forEach(function (n) {
      var g = el('g', { 'class': 'node' + (n.root ? ' root' : ''), tabindex: '0', 'data-tag': n.name });
      n.box = el('rect', { rx: 5, ry: 5 });
      n.label = el('text', { 'class': 'node-label', 'font-size': self.fontSize(n), dy: '0.34em' });
      n.label.textContent = '#' + n.name;
      g.appendChild(n.box);
      g.appendChild(n.label);
      g.addEventListener('pointerdown', function (e) { self.startDrag(e, n); });
      /* selection is fired from the pointerup in startDrag, not from here: a
         finger that slides a few pixels off a small circle lands its pointerup
         on another element and no click is ever synthesised for the node */
      g.addEventListener('click', function (e) { e.stopPropagation(); });
      g.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        if (self.opts.onOpen) self.opts.onOpen(n.name);
      });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && self.opts.onOpen) self.opts.onOpen(n.name);
      });
      n.g = g;
      self.nodeLayer.appendChild(g);
      self.measure(n); /* only once it is in the document can the text be read */
    });
  };

  /* the line an arrow takes: down through its waypoints, clipped to the two
     boxes at the ends so the head lands on the border and not in the text */
  Graph.prototype.linkPath = function (l) {
    if (l.kind === 'sibling') {
      /* siblings sit on the same row as often as not, and a straight line
         along a row runs through everything between them - so it hangs
         underneath instead */
      var sag = Math.max(22, Math.abs(l.b.x - l.a.x) * 0.11);
      var ay = l.a.y + l.a.hh, by = l.b.y + l.b.hh;
      var cy = Math.max(ay, by) + sag;
      return 'M ' + l.a.x + ' ' + ay +
             ' Q ' + ((l.a.x + l.b.x) / 2) + ' ' + cy + ' ' + l.b.x + ' ' + by;
    }
    var pts = [{ x: l.a.x, y: l.a.y }];
    l.bend.forEach(function (d) { pts.push({ x: d.x, y: d.y }); });
    pts.push({ x: l.b.x, y: l.b.y });

    var d1x = pts[1].x - l.a.x, d1y = pts[1].y - l.a.y;
    if (!d1x && !d1y) d1y = 0.001;
    var s = edge(l.a, d1x, d1y, 1);
    pts[0] = { x: l.a.x + s.x, y: l.a.y + s.y };

    var last = pts.length - 1;
    var d2x = pts[last - 1].x - l.b.x, d2y = pts[last - 1].y - l.b.y;
    if (!d2x && !d2y) d2y = -0.001;
    var e2 = edge(l.b, d2x, d2y, 5);
    pts[last] = { x: l.b.x + e2.x, y: l.b.y + e2.y };

    var d = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length; i++) d += ' L ' + pts[i].x + ' ' + pts[i].y;
    return d;
  };

  Graph.prototype.paint = function () {
    var self = this;

    /* the map is built hidden whenever a note is deep-linked, and text cannot
       be measured until it is on screen. The first frame that can read the
       boxes properly is also the first one that can place them properly. */
    var late = false;
    this.nodes.forEach(function (n) {
      if (n.measured) return;
      self.measure(n);
      if (n.measured) late = true;
    });
    if (late && !this.relaying) {
      this.relaying = true;
      this.layout(false);
      this.relaying = false;
      return;
    }

    this.root.setAttribute('transform',
      'translate(' + this.view.x + ',' + this.view.y + ') scale(' + this.view.k + ')');

    this.links.forEach(function (l) {
      if (!l.el) return;
      l.el.setAttribute('d', self.linkPath(l));
      var hot = self.highlight[l.a.name] && self.highlight[l.b.name];
      l.el.classList.toggle('hi', !!hot);
      if (l.kind === 'parent') l.el.setAttribute('marker-end', hot ? 'url(#arrow-hi)' : 'url(#arrow)');
    });

    this.nodes.forEach(function (n) {
      n.g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
      n.g.classList.toggle('selected', self.selected === n.name);
      n.g.classList.toggle('hi', !!self.highlight[n.name]);
      n.g.classList.toggle('dim', self.hasHighlight && !self.highlight[n.name]);
      n.box.setAttribute('x', -n.hw);
      n.box.setAttribute('y', -n.hh);
      n.box.setAttribute('width', n.w);
      n.box.setAttribute('height', n.h);
    });
  };

  Graph.prototype.setHighlight = function (names) {
    this.highlight = Object.create(null);
    this.hasHighlight = !!(names && names.length);
    (names || []).forEach(function (n) { this.highlight[n] = true; }, this);
    this.paint();
  };

  Graph.prototype.select = function (name) {
    this.selected = name;
    this.paint();
  };

  /* ---------------- interaction ---------------- */

  Graph.prototype.toLocal = function (clientX, clientY) {
    var r = this.svg.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.view.x) / this.view.k,
      y: (clientY - r.top - this.view.y) / this.view.k
    };
  };

  /* A finger never holds still: a tap wanders a few pixels between pointerdown
     and pointerup. Treating any movement at all as a drag swallowed the tap
     that follows, so movement only counts as a drag past this much slop. */
  function slop(e) { return e.pointerType === 'mouse' ? 3 : 12; }

  /* A tap is not finished at pointerup: the browser still owes the page one
     click, and it aims that click by hit-testing the spot a second time.
     Selecting a hashtag opens the panels, which on a phone slide up over the
     bottom of the map - over the very spot the finger just left. So the click
     lands on whatever the panel has just put there, and a note opens on top of
     the panel that was asked for. A mouse never does this: its click goes to
     the common ancestor of mousedown and mouseup, never to something that
     appeared in between. So after a tap that selects, swallow the one click
     the tap has left in it. */
  function eatNextClick() {
    function eat(e) { e.stopPropagation(); e.preventDefault(); done(); }
    function done() {
      window.removeEventListener('click', eat, true);
      clearTimeout(timer);
    }
    /* long enough for the click to arrive, short enough that a real second
       tap - which no finger manages this fast - is never the one eaten */
    var timer = setTimeout(done, 600);
    window.addEventListener('click', eat, true);
  }

  Graph.prototype.startDrag = function (e, n) {
    e.preventDefault();
    e.stopPropagation();
    var self = this;
    var p = this.toLocal(e.clientX, e.clientY);
    var ox = n.x - p.x, oy = n.y - p.y;
    var sx = e.clientX, sy = e.clientY, limit = slop(e), id = e.pointerId;
    var dragging = false;
    function move(ev) {
      if (ev.pointerId !== id) return;
      if (!dragging) {
        if (Math.abs(ev.clientX - sx) < limit && Math.abs(ev.clientY - sy) < limit) return;
        dragging = true;
        n.fixed = true;
      }
      var q = self.toLocal(ev.clientX, ev.clientY);
      n.x = q.x + ox; n.y = q.y + oy;
      self.paint();
    }
    function up(ev) {
      if (ev && ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (dragging) {
        /* a hashtag dragged somewhere stays there - nothing springs back -
           until the map is laid out again */
        n.tx = n.x; n.ty = n.y; n.fixed = false;
        return;
      }
      n.fixed = false;
      if (ev && ev.type === 'pointerup' && self.opts.onSelect) {
        if (ev.pointerType !== 'mouse') eatNextClick();
        self.opts.onSelect(n.name, ev);
      }
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  Graph.prototype.bindEvents = function () {
    var self = this;
    this.svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = self.svg.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var factor = Math.pow(1.0015, -e.deltaY);
      var k2 = Math.max(0.2, Math.min(4, self.view.k * factor));
      self.view.x = mx - (mx - self.view.x) * (k2 / self.view.k);
      self.view.y = my - (my - self.view.y) * (k2 / self.view.k);
      self.view.k = k2;
      self.paint();
    }, { passive: false });

    this.svg.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.node')) return;
      var sx = e.clientX, sy = e.clientY;
      var vx = self.view.x, vy = self.view.y;
      var limit = slop(e), id = e.pointerId;
      var panning = false;
      function move(ev) {
        if (ev.pointerId !== id) return;
        if (!panning) {
          if (Math.abs(ev.clientX - sx) < limit && Math.abs(ev.clientY - sy) < limit) return;
          panning = true;
        }
        self.view.x = vx + (ev.clientX - sx);
        self.view.y = vy + (ev.clientY - sy);
        self.paint();
      }
      function up(ev) {
        if (ev && ev.pointerId !== id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (ev && ev.type === 'pointercancel') return;
        if (!panning && self.opts.onBlank) self.opts.onBlank();
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  };

  Graph.prototype.fit = function () {
    if (!this.nodes.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    /* fit to where the boxes are going, not to wherever the slide is up to */
    this.nodes.forEach(function (n) {
      var x = n.tx === undefined ? n.x : n.tx, y = n.ty === undefined ? n.y : n.ty;
      minX = Math.min(minX, x - n.hw); maxX = Math.max(maxX, x + n.hw);
      minY = Math.min(minY, y - n.hh); maxY = Math.max(maxY, y + n.hh);
    });
    var pad = 34;
    var w = this.width(), h = this.height();
    var bw = Math.max(1, maxX - minX + pad * 2), bh = Math.max(1, maxY - minY + pad * 2);
    var k = Math.max(0.2, Math.min(2, Math.min(w / bw, h / bh)));
    this.view.k = k;
    this.view.x = (w - (maxX + minX) * k) / 2;
    this.view.y = (h - (maxY + minY) * k) / 2;
    this.paint();
  };

  Graph.prototype.stop = function () { this.running = false; };

  global.Graph = Graph;
})(window);
