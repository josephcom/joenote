/* JoeNote - js/sanitize.js
 * Allow-list sanitiser. Markdown lets raw HTML through by design, so every
 * rendered note is passed through this before it touches the DOM.
 */
(function (global) {
  'use strict';

  var ALLOWED = {};
  ('a abbr b blockquote br caption code col colgroup dd del details div dl dt em figcaption ' +
    'figure h1 h2 h3 h4 h5 h6 hr i img input ins kbd li mark ol p pre q rp rt ruby s samp ' +
    'section small span strong sub summary sup table tbody td tfoot th thead tr u ul var wbr')
    .split(' ').forEach(function (t) { ALLOWED[t] = true; });

  var GLOBAL_ATTRS = { 'class': true, id: true, title: true, dir: true, lang: true };
  var ATTRS = {
    a: { href: true, target: true, rel: true, 'data-tag': true },
    img: { src: true, alt: true, width: true, height: true, loading: true, 'data-src': true },
    input: { type: true, checked: true, disabled: true },
    td: { colspan: true, rowspan: true, style: true },
    th: { colspan: true, rowspan: true, style: true, scope: true },
    col: { span: true, style: true },
    ol: { start: true, type: true, reversed: true },
    details: { open: true }
  };

  var CTRL = new RegExp('[\\u0000-\\u0020]', 'g');

  /* only text-align survives from style="" */
  function cleanStyle(value) {
    var m = /text-align\s*:\s*(left|right|center|justify)/i.exec(value || '');
    return m ? 'text-align:' + m[1].toLowerCase() : null;
  }

  function safeURL(url, allowData) {
    var u = String(url == null ? '' : url).trim();
    var probe = u.replace(CTRL, '').toLowerCase();
    if (/^javascript:/.test(probe) || /^vbscript:/.test(probe)) return null;
    if (/^data:/.test(probe)) {
      if (!allowData) return null;
      if (!/^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,/.test(probe)) return null;
    }
    return u;
  }

  function sanitizeFragment(root) {
    var walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    var doomed = [];
    var el;
    while ((el = walker.nextNode())) {
      var tag = el.tagName.toLowerCase();
      if (!ALLOWED[tag]) { doomed.push(el); continue; }
      for (var i = el.attributes.length - 1; i >= 0; i--) {
        var attr = el.attributes[i];
        var name = attr.name.toLowerCase();
        var ok = GLOBAL_ATTRS[name] || (ATTRS[tag] && ATTRS[tag][name]);
        if (/^on/.test(name)) ok = false;
        if (!ok) { el.removeAttribute(attr.name); continue; }
        if (name === 'style') {
          var s = cleanStyle(attr.value);
          if (s) el.setAttribute('style', s); else el.removeAttribute('style');
          continue;
        }
        if (name === 'href') {
          var h = safeURL(attr.value, false);
          if (h === null) el.removeAttribute('href'); else el.setAttribute('href', h);
          continue;
        }
        if (name === 'src') {
          var src = safeURL(attr.value, true);
          if (src === null) el.removeAttribute('src'); else el.setAttribute('src', src);
          continue;
        }
      }
      var href = el.getAttribute && el.getAttribute('href');
      if (tag === 'a' && href && /^[a-z][a-z0-9+.\-]*:/i.test(href) && !/^mailto:/i.test(href)) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      if (tag === 'input') {
        el.setAttribute('disabled', '');
        if ((el.getAttribute('type') || '').toLowerCase() !== 'checkbox') doomed.push(el);
      }
    }
    /* unwrap disallowed elements, keeping their text content */
    for (var d = doomed.length - 1; d >= 0; d--) {
      var node = doomed[d];
      if (!node.parentNode) continue;
      while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
      node.parentNode.removeChild(node);
    }
    return root;
  }

  /* html string -> sanitized DocumentFragment */
  function toFragment(html) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    sanitizeFragment(doc.body);
    var frag = document.createDocumentFragment();
    while (doc.body.firstChild) frag.appendChild(document.adoptNode(doc.body.firstChild));
    return frag;
  }

  global.Sanitize = { toFragment: toFragment, fragment: sanitizeFragment };
})(window);
