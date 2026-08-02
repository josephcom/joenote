/* JoeNote - js/graph.js
 * The hashtag map: an SVG force-directed graph of the tag ontology.
 * Solid arrows point parent -> child. Dashed lines join siblings.
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
    this.view = { x: 0, y: 0, k: 1 };
    this.selected = null;
    this.highlight = Object.create(null);
    this.running = false;
    this.alpha = 1;
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
    this.nodes = [];
    this.index = Object.create(null);

    var w = this.width() || 800, h = this.height() || 500;
    names.forEach(function (name, i) {
      var prev = old[name];
      var angle = (i / Math.max(1, names.length)) * Math.PI * 2;
      var node = {
        name: name,
        count: tagMap[name].count || 0,
        x: prev ? prev.x : w / 2 + Math.cos(angle) * (120 + (i % 5) * 40),
        y: prev ? prev.y : h / 2 + Math.sin(angle) * (120 + (i % 5) * 40),
        vx: 0, vy: 0, fixed: false
      };
      self.nodes.push(node);
      self.index[name] = node;
    });

    this.links = [];
    names.forEach(function (name) {
      var rec = tagMap[name];
      Object.keys(rec.parents).forEach(function (p) {
        if (self.index[p]) self.links.push({ a: self.index[p], b: self.index[name], kind: 'parent' });
      });
      Object.keys(rec.siblings).forEach(function (s) {
        if (self.index[s] && name < s) self.links.push({ a: self.index[name], b: self.index[s], kind: 'sibling' });
      });
    });

    this.render();
    this.kick();
  };

  Graph.prototype.width = function () { return this.svg.clientWidth || this.svg.getBoundingClientRect().width; };
  Graph.prototype.height = function () { return this.svg.clientHeight || this.svg.getBoundingClientRect().height; };

  Graph.prototype.radius = function (n) {
    return 9 + Math.min(18, Math.sqrt(n.count) * 4.5);
  };

  /* ---------------- rendering ---------------- */

  Graph.prototype.render = function () {
    var self = this;
    while (this.linkLayer.firstChild) this.linkLayer.removeChild(this.linkLayer.firstChild);
    while (this.nodeLayer.firstChild) this.nodeLayer.removeChild(this.nodeLayer.firstChild);

    this.links.forEach(function (l) {
      l.el = el('line', {
        'class': 'link ' + l.kind,
        'marker-end': l.kind === 'parent' ? 'url(#arrow)' : null
      });
      self.linkLayer.appendChild(l.el);
    });

    this.nodes.forEach(function (n) {
      var g = el('g', { 'class': 'node', tabindex: '0', 'data-tag': n.name });
      n.circle = el('circle', { r: self.radius(n) });
      n.label = el('text', { 'class': 'node-label', dy: -self.radius(n) - 6 });
      n.label.textContent = '#' + n.name;
      g.appendChild(n.circle);
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
    });

    this.paint();
  };

  Graph.prototype.paint = function () {
    var self = this;
    this.root.setAttribute('transform',
      'translate(' + this.view.x + ',' + this.view.y + ') scale(' + this.view.k + ')');

    this.links.forEach(function (l) {
      if (!l.el) return;
      var dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ra = self.radius(l.a) + 2, rb = self.radius(l.b) + 6;
      l.el.setAttribute('x1', l.a.x + dx / len * ra);
      l.el.setAttribute('y1', l.a.y + dy / len * ra);
      l.el.setAttribute('x2', l.b.x - dx / len * rb);
      l.el.setAttribute('y2', l.b.y - dy / len * rb);
      var hot = self.highlight[l.a.name] && self.highlight[l.b.name];
      l.el.classList.toggle('hi', !!hot);
      if (l.kind === 'parent') l.el.setAttribute('marker-end', hot ? 'url(#arrow-hi)' : 'url(#arrow)');
    });

    this.nodes.forEach(function (n) {
      n.g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
      n.g.classList.toggle('selected', self.selected === n.name);
      n.g.classList.toggle('hi', !!self.highlight[n.name]);
      n.g.classList.toggle('dim', self.hasHighlight && !self.highlight[n.name]);
      n.circle.setAttribute('r', self.radius(n));
      n.label.setAttribute('dy', -self.radius(n) - 6);
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

  /* ---------------- simulation ---------------- */

  Graph.prototype.kick = function (alpha) {
    this.alpha = alpha || 1;
    if (!this.running) {
      this.running = true;
      var self = this;
      requestAnimationFrame(function step() {
        if (!self.running) return;
        self.tick();
        self.paint();
        self.alpha *= 0.97;
        if (self.alpha < 0.005) { self.running = false; return; }
        requestAnimationFrame(step);
      });
    }
  };

  Graph.prototype.tick = function () {
    var nodes = this.nodes, links = this.links;
    var w = this.width(), h = this.height();
    var cx = w / 2, cy = h / 2;
    var i, j, a, b, dx, dy, d2, d, f;

    /* repulsion */
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = b.x - a.x; dy = b.y - a.y;
        d2 = dx * dx + dy * dy;
        if (d2 < 1) { d2 = 1; dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); }
        if (d2 > 700 * 700) continue;
        d = Math.sqrt(d2);
        f = 5200 / d2;
        var ux = dx / d, uy = dy / d;
        a.vx -= ux * f; a.vy -= uy * f;
        b.vx += ux * f; b.vy += uy * f;
      }
    }

    /* springs */
    for (i = 0; i < links.length; i++) {
      var l = links[i];
      a = l.a; b = l.b;
      dx = b.x - a.x; dy = b.y - a.y;
      d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var rest = l.kind === 'parent' ? 130 : 95;
      var k = l.kind === 'parent' ? 0.035 : 0.02;
      f = (d - rest) * k;
      var vx = dx / d * f, vy = dy / d * f;
      a.vx += vx; a.vy += vy;
      b.vx -= vx; b.vy -= vy;
      /* parents sit above their children */
      if (l.kind === 'parent') {
        var want = 70;
        var gap = (b.y - a.y) - want;
        a.vy += gap * 0.012;
        b.vy -= gap * 0.012;
      }
    }

    /* centring + integration */
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (a.fixed) { a.vx = a.vy = 0; continue; }
      a.vx += (cx - a.x) * 0.004;
      a.vy += (cy - a.y) * 0.004;
      a.vx *= 0.82; a.vy *= 0.82;
      var speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      var max = 24 * this.alpha + 1;
      if (speed > max) { a.vx = a.vx / speed * max; a.vy = a.vy / speed * max; }
      a.x += a.vx * this.alpha;
      a.y += a.vy * this.alpha;
    }
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
      n.fixed = false;
      if (dragging) { self.kick(0.4); return; }
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
    this.nodes.forEach(function (n) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    var pad = 70;
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
