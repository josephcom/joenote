/* JoeNote - js/tags.js
 * The hashtag ontology, stored as XML (tags.xml).
 *
 *   <joenote version="1">
 *     <hashtags>
 *       <hashtag name="project">
 *         <parent name="work"/>
 *         <sibling name="task"/>
 *       </hashtag>
 *     </hashtags>
 *   </joenote>
 *
 * A hashtag may have many parents and many siblings. Parent edges are
 * directed and acyclic; sibling edges are symmetric and always stored on
 * both tags.
 */
(function (global) {
  'use strict';

  var DEFAULT_XML =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<joenote version="1">\n  <hashtags>\n  </hashtags>\n</joenote>\n';

  function norm(name) {
    return String(name || '').trim().replace(/^#+/, '').replace(/\/+$/, '').toLowerCase();
  }

  var Tags = {
    map: Object.create(null),   /* name -> { name, parents:Set, siblings:Set, count } */

    /* ---------------- load / save ---------------- */

    parse: function (xmlText) {
      this.map = Object.create(null);
      if (!xmlText || !xmlText.trim()) return this;
      var doc;
      try {
        doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      } catch (e) { return this; }
      if (doc.getElementsByTagName('parsererror').length) {
        console.warn('tags.xml is not well-formed XML; starting from an empty map.');
        return this;
      }
      var els = doc.getElementsByTagName('hashtag');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var name = norm(el.getAttribute('name'));
        if (!name) continue;
        var rec = this.ensure(name);
        var kids = el.children;
        for (var j = 0; j < kids.length; j++) {
          var k = kids[j], other = norm(k.getAttribute('name'));
          if (!other || other === name) continue;
          if (k.tagName === 'parent') { rec.parents[other] = true; this.ensure(other); }
          else if (k.tagName === 'child') { this.ensure(other).parents[name] = true; }
          else if (k.tagName === 'sibling') {
            rec.siblings[other] = true;
            this.ensure(other).siblings[name] = true;
          }
        }
      }
      this.breakCycles();
      return this;
    },

    serialize: function () {
      var doc = new DOMParser().parseFromString(DEFAULT_XML, 'application/xml');
      var host = doc.getElementsByTagName('hashtags')[0];
      var names = Object.keys(this.map).sort();
      for (var i = 0; i < names.length; i++) {
        var rec = this.map[names[i]];
        var el = doc.createElement('hashtag');
        el.setAttribute('name', rec.name);
        var ps = Object.keys(rec.parents).sort();
        for (var p = 0; p < ps.length; p++) {
          var pe = doc.createElement('parent');
          pe.setAttribute('name', ps[p]);
          el.appendChild(pe);
        }
        var ss = Object.keys(rec.siblings).sort();
        for (var s = 0; s < ss.length; s++) {
          var se = doc.createElement('sibling');
          se.setAttribute('name', ss[s]);
          el.appendChild(se);
        }
        host.appendChild(el);
      }
      var xml = new XMLSerializer().serializeToString(doc);
      return prettyXML(xml);
    },

    /* ---------------- graph ---------------- */

    ensure: function (name) {
      name = norm(name);
      if (!name) return null;
      if (!this.map[name]) {
        this.map[name] = { name: name, parents: Object.create(null), siblings: Object.create(null), count: 0 };
      }
      return this.map[name];
    },

    has: function (name) { return !!this.map[norm(name)]; },

    all: function () {
      var self = this;
      return Object.keys(this.map).sort().map(function (n) { return self.map[n]; });
    },

    remove: function (name) {
      name = norm(name);
      delete this.map[name];
      var self = this;
      Object.keys(this.map).forEach(function (n) {
        delete self.map[n].parents[name];
        delete self.map[n].siblings[name];
      });
    },

    rename: function (from, to) {
      from = norm(from); to = norm(to);
      if (!from || !to || from === to || !this.map[from]) return false;
      var rec = this.map[from];
      var dest = this.ensure(to);
      Object.keys(rec.parents).forEach(function (p) { if (p !== to) dest.parents[p] = true; });
      Object.keys(rec.siblings).forEach(function (s) { if (s !== to) dest.siblings[s] = true; });
      delete this.map[from];
      var self = this;
      Object.keys(this.map).forEach(function (n) {
        if (self.map[n].parents[from]) { delete self.map[n].parents[from]; if (n !== to) self.map[n].parents[to] = true; }
        if (self.map[n].siblings[from]) { delete self.map[n].siblings[from]; if (n !== to) self.map[n].siblings[to] = true; }
      });
      this.breakCycles();
      return true;
    },

    addParent: function (child, parent) {
      child = norm(child); parent = norm(parent);
      if (!child || !parent || child === parent) return false;
      if (this.descendants(child)[parent]) return false;  /* would create a cycle */
      this.ensure(parent);
      this.ensure(child).parents[parent] = true;
      return true;
    },

    removeParent: function (child, parent) {
      var rec = this.map[norm(child)];
      if (rec) delete rec.parents[norm(parent)];
    },

    addSibling: function (a, b) {
      a = norm(a); b = norm(b);
      if (!a || !b || a === b) return false;
      this.ensure(a).siblings[b] = true;
      this.ensure(b).siblings[a] = true;
      return true;
    },

    removeSibling: function (a, b) {
      a = norm(a); b = norm(b);
      if (this.map[a]) delete this.map[a].siblings[b];
      if (this.map[b]) delete this.map[b].siblings[a];
    },

    children: function (name) {
      name = norm(name);
      var out = [], self = this;
      Object.keys(this.map).forEach(function (n) { if (self.map[n].parents[name]) out.push(n); });
      return out.sort();
    },

    parentsOf: function (name) {
      var rec = this.map[norm(name)];
      return rec ? Object.keys(rec.parents).sort() : [];
    },

    siblingsOf: function (name) {
      var rec = this.map[norm(name)];
      return rec ? Object.keys(rec.siblings).sort() : [];
    },

    /* set of every ancestor of `name` (not including itself) */
    ancestors: function (name) {
      var out = Object.create(null), stack = this.parentsOf(name), self = this;
      while (stack.length) {
        var n = stack.pop();
        if (out[n]) continue;
        out[n] = true;
        self.parentsOf(n).forEach(function (p) { if (!out[p]) stack.push(p); });
      }
      return out;
    },

    /* set of every descendant of `name` (not including itself) */
    descendants: function (name) {
      var out = Object.create(null), stack = this.children(name), self = this;
      while (stack.length) {
        var n = stack.pop();
        if (out[n]) continue;
        out[n] = true;
        self.children(n).forEach(function (c) { if (!out[c]) stack.push(c); });
      }
      return out;
    },

    roots: function () {
      var self = this;
      return Object.keys(this.map).filter(function (n) {
        return Object.keys(self.map[n].parents).length === 0;
      }).sort();
    },

    breakCycles: function () {
      var self = this;
      Object.keys(this.map).forEach(function (n) {
        Object.keys(self.map[n].parents).forEach(function (p) {
          /* if p is reachable downward from n, the edge n->p closes a loop */
          var seen = Object.create(null), stack = [p];
          while (stack.length) {
            var cur = stack.pop();
            if (cur === n) { delete self.map[n].parents[p]; return; }
            if (seen[cur]) continue;
            seen[cur] = true;
            Object.keys((self.map[cur] || { parents: {} }).parents).forEach(function (x) { stack.push(x); });
          }
        });
      });
    },

    /* Register tags discovered in notes so they show on the map even when
       they have no declared relations yet. */
    syncCounts: function (notes) {
      var self = this;
      Object.keys(this.map).forEach(function (n) { self.map[n].count = 0; });
      notes.forEach(function (note) {
        (note.tags || []).forEach(function (t) {
          var rec = self.ensure(t);
          if (rec) rec.count++;
        });
      });
    },

    /* Tags of a note plus all their ancestors - used by tag: searches. */
    expand: function (tagList) {
      var out = Object.create(null), self = this;
      (tagList || []).forEach(function (t) {
        t = norm(t);
        out[t] = true;
        var anc = self.ancestors(t);
        Object.keys(anc).forEach(function (a) { out[a] = true; });
      });
      return out;
    },

    normalize: norm,
    DEFAULT_XML: DEFAULT_XML
  };

  function prettyXML(xml) {
    /* DOMParser output is one long line; give it newlines + two-space indent. */
    var out = xml.replace(/></g, '>\n<').split('\n');
    var depth = 0, res = [];
    for (var i = 0; i < out.length; i++) {
      var line = out[i].trim();
      if (!line) continue;
      if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
      res.push(new Array(depth + 1).join('  ') + line);
      if (/^<[^!?/]/.test(line) && !/\/>$/.test(line) && !/<\/[^>]+>$/.test(line)) depth++;
    }
    var body = res.join('\n');
    if (!/^<\?xml/.test(body)) body = '<?xml version="1.0" encoding="UTF-8"?>\n' + body;
    return body + '\n';
  }

  global.Tags = Tags;
})(window);
