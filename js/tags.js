/* JoeNote - js/tags.js
 * The list of hashtags, stored as XML (tags.xml).
 *
 *   <joenote version="1">
 *     <hashtags>
 *       <hashtag name="project"/>
 *       <hashtag name="work"/>
 *     </hashtags>
 *   </joenote>
 *
 * Hashtags stand alone. There are no parents, children or siblings: one tag
 * never implies another, and #work tells you nothing about #project. The file
 * used to carry those links, and any that are still in it are read past and
 * dropped the next time it is written.
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
    map: Object.create(null),   /* name -> { name, count } */

    /* ---------------- load / save ---------------- */

    parse: function (xmlText) {
      this.map = Object.create(null);
      if (!xmlText || !xmlText.trim()) return this;
      var doc;
      try {
        doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      } catch (e) { return this; }
      if (doc.getElementsByTagName('parsererror').length) {
        console.warn('tags.xml is not well-formed XML; starting from an empty list.');
        return this;
      }
      var els = doc.getElementsByTagName('hashtag');
      for (var i = 0; i < els.length; i++) {
        var name = norm(els[i].getAttribute('name'));
        if (name) this.ensure(name);
      }
      return this;
    },

    serialize: function () {
      var doc = new DOMParser().parseFromString(DEFAULT_XML, 'application/xml');
      var host = doc.getElementsByTagName('hashtags')[0];
      var names = Object.keys(this.map).sort();
      for (var i = 0; i < names.length; i++) {
        var el = doc.createElement('hashtag');
        el.setAttribute('name', this.map[names[i]].name);
        host.appendChild(el);
      }
      var xml = new XMLSerializer().serializeToString(doc);
      return prettyXML(xml);
    },

    /* ---------------- the list ---------------- */

    ensure: function (name) {
      name = norm(name);
      if (!name) return null;
      if (!this.map[name]) this.map[name] = { name: name, count: 0 };
      return this.map[name];
    },

    has: function (name) { return !!this.map[norm(name)]; },

    all: function () {
      var self = this;
      return Object.keys(this.map).sort().map(function (n) { return self.map[n]; });
    },

    rename: function (from, to) {
      from = norm(from); to = norm(to);
      if (!from || !to || from === to || !this.map[from]) return false;
      delete this.map[from];
      this.ensure(to);
      return true;
    },

    /* Register tags discovered in notes so they show on the map even when
       they are not in tags.xml yet. */
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
