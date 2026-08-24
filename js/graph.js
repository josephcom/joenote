/* JoeNote - js/graph.js
 * The hashtag map: every hashtag as a box, and nothing else.
 *
 * Hashtags do not belong to one another. There is no tree, no arrows and no
 * green tops of branches - one tag is exactly as important as the next, so
 * they are all drawn the same and simply listed.
 *
 * The listing runs down before it runs across: the first column starts at the
 * top left and fills to the bottom of the map, then the next column starts,
 * and so on, in alphabetical order throughout. How long a column is depends
 * on how much of the map you can see - so zooming out gives short columns and
 * a lot of them, and zooming in gives fewer. Once the columns will no longer
 * fit across the map, they grow taller instead and the map scrolls down.
 * It never scrolls sideways: there is always something below, never beside.
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
    this.view = { x: 0, y: 0, k: 1 };
    this.content = { w: 0, h: 0 };
    this.selected = null;
    this.highlight = Object.create(null);
    this.build();
    this.bindEvents();
  }

  Graph.prototype.build = function () {
    var svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    this.root = el('g', { 'class': 'graph-root' });
    this.nodeLayer = el('g', { 'class': 'nodes' });
    this.root.appendChild(this.nodeLayer);
    svg.appendChild(this.root);
  };

  /* ---------------- data ---------------- */

  Graph.prototype.setData = function (tagMap) {
    var self = this;
    var names = Object.keys(tagMap).sort(function (a, b) { return a.localeCompare(b); });
    this.nodes = [];
    this.index = Object.create(null);

    names.forEach(function (name) {
      var node = {
        name: name,
        count: tagMap[name].count || 0,
        x: 0, y: 0,
        /* a placeholder box, so the layout has sizes to work with even if it
           is asked to run before the first measurement */
        w: 60, h: 24, hw: 30, hh: 12, measured: false
      };
      self.nodes.push(node);
      self.index[name] = node;
    });

    this.render();
    this.layout();
  };

  Graph.prototype.width = function () { return this.svg.clientWidth || this.svg.getBoundingClientRect().width; };
  Graph.prototype.height = function () { return this.svg.clientHeight || this.svg.getBoundingClientRect().height; };

  /* ---------------- box geometry ---------------- */

  var PAD_X = 11, PAD_Y = 6;
  var FONT = 13;      /* one size for every tag - a column of mixed type does
                         not line up, and nothing here ranks above anything */
  var GAP_X = 18;     /* clear air between one column and the next */
  var GAP_Y = 10;     /* clear air between one tag and the one below it */
  var EDGE = 16;      /* margin around the whole listing */

  Graph.prototype.fontSize = function () { return FONT; };

  /* Text can only be measured once it is on screen, and the map is built
     hidden whenever a note is deep-linked. So guess from the character count
     and take the real reading the first time the map is given a size. */
  Graph.prototype.measure = function (n) {
    var w = 0;
    if (n.label && this.width()) {
      try { w = n.label.getComputedTextLength(); } catch (e) { w = 0; }
    }
    n.measured = w > 0;
    if (!w) w = ('#' + n.name).length * FONT * 0.58;
    n.w = Math.round(w + PAD_X * 2);
    n.h = Math.round(FONT + PAD_Y * 2);
    n.hw = n.w / 2;
    n.hh = n.h / 2;
  };

  /* ---------------- layout ----------------
   * Down first, then across. Every cell is the same size - as wide as the
   * longest hashtag and as tall as the tallest box - so the columns line up
   * however uneven the words are.
   */

  Graph.prototype.layout = function () {
    var self = this;
    if (!this.nodes.length) {
      this.content = { w: 0, h: 0 };
      this.view.x = 0; this.view.y = 0;
      this.paint();
      return;
    }

    var colW = 0, rowH = 0;
    this.nodes.forEach(function (n) {
      if (!n.measured) self.measure(n);
      colW = Math.max(colW, n.w);
      rowH = Math.max(rowH, n.h);
    });
    var cellW = colW + GAP_X, cellH = rowH + GAP_Y;

    /* how much of the map the eye can hold at this zoom, in map units */
    var k = this.view.k;
    var vw = Math.max(1, this.width() / k - EDGE * 2);
    var vh = Math.max(1, this.height() / k - EDGE * 2);

    var cols = Math.max(1, Math.floor((vw + GAP_X) / cellW));
    var fits = Math.max(1, Math.floor((vh + GAP_Y) / cellH));

    var total = this.nodes.length;
    /* a column is as long as the map is tall - unless that would need more
       columns than there is room for, in which case the columns grow and the
       map gains something to scroll down to */
    var per = fits;
    if (Math.ceil(total / per) > cols) per = Math.ceil(total / cols);

    var usedCols = Math.ceil(total / per);
    var usedRows = Math.min(per, total);

    this.nodes.forEach(function (n, i) {
      var c = Math.floor(i / per), r = i % per;
      /* boxes are hung from the left of their column, like a list, rather
         than centred on it - a ragged left edge is much harder to read */
      n.x = EDGE + c * cellW + n.hw;
      n.y = EDGE + r * cellH + rowH / 2;
    });

    this.content = {
      w: EDGE * 2 + usedCols * cellW - GAP_X,
      h: EDGE * 2 + usedRows * cellH - GAP_Y
    };

    this.clamp();
    this.paint();
  };

  /* The map is pinned to the left and can only travel up and down, and never
     past its own ends. */
  Graph.prototype.clamp = function () {
    var span = this.content.h * this.view.k - this.height();
    this.view.x = 0;
    this.view.y = span > 0 ? Math.max(-span, Math.min(0, this.view.y)) : 0;
  };

  /* how far down the listing we are, 0 at the top and 1 at the bottom - kept
     across a zoom, since the columns are rebuilt and there is no one box the
     view could sensibly stay pinned to */
  Graph.prototype.scrolled = function () {
    var span = this.content.h * this.view.k - this.height();
    return span > 0 ? -this.view.y / span : 0;
  };

  Graph.prototype.scrollTo = function (frac) {
    var span = this.content.h * this.view.k - this.height();
    this.view.y = span > 0 ? -frac * span : 0;
    this.clamp();
    this.paint();
  };

  Graph.prototype.zoomBy = function (factor) {
    var was = this.scrolled();
    var k = Math.max(0.25, Math.min(4, this.view.k * factor));
    if (k === this.view.k) return;
    this.view.k = k;
    this.layout();
    this.scrollTo(was);
  };

  /* the window changing size changes how long a column can be */
  Graph.prototype.resize = function () {
    var was = this.scrolled();
    this.layout();
    this.scrollTo(was);
  };

  /* ---------------- rendering ---------------- */

  Graph.prototype.render = function () {
    var self = this;
    while (this.nodeLayer.firstChild) this.nodeLayer.removeChild(this.nodeLayer.firstChild);

    this.nodes.forEach(function (n) {
      var g = el('g', { 'class': 'node', tabindex: '0', 'data-tag': n.name });
      n.box = el('rect', { rx: 5, ry: 5 });
      n.label = el('text', { 'class': 'node-label', 'font-size': FONT, dy: '0.34em' });
      n.label.textContent = '#' + n.name;
      g.appendChild(n.box);
      g.appendChild(n.label);
      /* selection is fired from the pointerup on the map, not from a click:
         a finger that slides a few pixels off a small box lands its pointerup
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
      this.layout();
      this.relaying = false;
      return;
    }

    this.root.setAttribute('transform',
      'translate(' + this.view.x + ',' + this.view.y + ') scale(' + this.view.k + ')');

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

  Graph.prototype.bindEvents = function () {
    var self = this;

    this.svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.zoomBy(Math.pow(1.0015, -e.deltaY));
    }, { passive: false });

    /* One drag for the whole map, whether it starts on a hashtag or on the
       paper between them: it only ever slides the listing up and down. A
       press that goes nowhere is a tap, and taps mean something. */
    this.svg.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var hit = e.target.closest ? e.target.closest('.node') : null;
      var node = hit ? self.index[hit.getAttribute('data-tag')] : null;
      var sx = e.clientX, sy = e.clientY, vy = self.view.y;
      var limit = slop(e), id = e.pointerId;
      var panning = false;

      function move(ev) {
        if (ev.pointerId !== id) return;
        if (!panning) {
          if (Math.abs(ev.clientX - sx) < limit && Math.abs(ev.clientY - sy) < limit) return;
          panning = true;
        }
        self.view.y = vy + (ev.clientY - sy);
        self.clamp();
        self.paint();
      }
      function up(ev) {
        if (ev && ev.pointerId !== id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (panning) return;
        if (!ev || ev.type !== 'pointerup') return;
        if (node) {
          if (ev.pointerType !== 'mouse') eatNextClick();
          if (self.opts.onSelect) self.opts.onSelect(node.name, ev);
        } else if (self.opts.onBlank) {
          self.opts.onBlank();
        }
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  };

  global.Graph = Graph;
})(window);
