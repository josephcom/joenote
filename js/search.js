/* JoeNote - js/search.js
 * Query language for the home-page search box.
 *
 *   foo bar            implicit AND
 *   foo AND bar        AND  &&  &
 *   foo OR bar         OR   ||  |
 *   NOT foo            NOT  !   -
 *   (a OR b) AND !c    parentheses
 *   proj*  te?t        wildcards: * = any run, ? = one character
 *   "exact phrase"     quoted literal (no wildcards inside)
 *
 * Fields:
 *   #work / tag:work   tagged #work or any tag below it in the map
 *   tag:=work          exactly #work, ignore the hierarchy
 *   near:work          #work, its siblings, and everything under them
 *   title:foo  text:foo  file:foo
 *   is:untagged  has:image  has:tag  has:link  has:code
 */
(function (global) {
  'use strict';

  /* ---------------- tokenizer ---------------- */

  var T = { LP: 'LP', RP: 'RP', AND: 'AND', OR: 'OR', NOT: 'NOT', TERM: 'TERM', END: 'END' };
  var FIELDS = ['tag', 'title', 'text', 'body', 'file', 'name', 'is', 'has', 'near', 'in'];

  function tokenize(q) {
    var toks = [], i = 0, n = q.length;
    while (i < n) {
      var c = q[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '(') { toks.push({ t: T.LP }); i++; continue; }
      if (c === ')') { toks.push({ t: T.RP }); i++; continue; }
      if (c === '&') { i++; if (q[i] === '&') i++; toks.push({ t: T.AND }); continue; }
      if (c === '|') { i++; if (q[i] === '|') i++; toks.push({ t: T.OR }); continue; }
      if (c === '!') { i++; toks.push({ t: T.NOT }); continue; }
      /* a leading "-" negates, a "-" inside a word does not */
      if (c === '-' && (i === 0 || /[\s(]/.test(q[i - 1])) && i + 1 < n && !/[\s)]/.test(q[i + 1])) {
        i++; toks.push({ t: T.NOT }); continue;
      }

      /* a term: optional field prefix, then a quoted string or a bare run */
      var start = i, field = null;
      var fm = /^([A-Za-z_]+):/.exec(q.slice(i));
      if (fm && FIELDS.indexOf(fm[1].toLowerCase()) !== -1) {
        field = fm[1].toLowerCase();
        i += fm[0].length;
      } else if (c === '#') {
        field = 'tag';
        i++;
      }

      var value = '', quoted = false;
      if (q[i] === '"' || q[i] === "'") {
        var quote = q[i];
        quoted = true;
        i++;
        while (i < n && q[i] !== quote) {
          if (q[i] === '\\' && i + 1 < n) { value += q[i + 1]; i += 2; continue; }
          value += q[i]; i++;
        }
        i++; /* closing quote - be forgiving if it is missing */
      } else {
        while (i < n && !/[\s()|&]/.test(q[i])) {
          if (q[i] === '\\' && i + 1 < n) { value += q[i + 1]; i += 2; continue; }
          value += q[i]; i++;
        }
      }

      if (!value && !field) { i = start + 1; continue; }

      var upper = value.toUpperCase();
      if (!field && !quoted && (upper === 'AND' || upper === 'OR' || upper === 'NOT')) {
        toks.push({ t: T[upper] });
        continue;
      }
      toks.push({ t: T.TERM, field: field, value: value, quoted: quoted });
    }
    toks.push({ t: T.END });
    return toks;
  }

  /* ---------------- parser ---------------- */

  function parse(q) {
    var toks = tokenize(q || ''), pos = 0;

    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }

    function parseOr() {
      var left = parseAnd();
      while (peek().t === T.OR) { next(); left = { op: 'or', a: left, b: parseAnd() }; }
      return left;
    }
    function parseAnd() {
      var left = parseNot();
      for (;;) {
        var p = peek();
        if (p.t === T.AND) { next(); left = { op: 'and', a: left, b: parseNot() }; continue; }
        if (p.t === T.TERM || p.t === T.LP || p.t === T.NOT) { left = { op: 'and', a: left, b: parseNot() }; continue; }
        return left;
      }
    }
    function parseNot() {
      if (peek().t === T.NOT) { next(); return { op: 'not', a: parseNot() }; }
      return parseAtom();
    }
    function parseAtom() {
      var p = next();
      if (p.t === T.LP) {
        var inner = parseOr();
        if (peek().t === T.RP) next();
        else throw new SyntaxError('Missing ")"');
        return inner;
      }
      if (p.t === T.TERM) return { op: 'term', field: p.field, value: p.value, quoted: p.quoted };
      if (p.t === T.END) throw new SyntaxError('Query ends unexpectedly');
      if (p.t === T.RP) throw new SyntaxError('Unexpected ")"');
      throw new SyntaxError('Unexpected token');
    }

    if (peek().t === T.END) return null;
    var ast = parseOr();
    if (peek().t !== T.END) throw new SyntaxError('Unexpected ")"');
    return ast;
  }

  /* ---------------- matching ---------------- */

  var RE_SPECIAL = '.+^${}()|[]\\';

  function globToRe(pat, anchored) {
    var s = String(pat), src = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '*') src += '.*';
      else if (c === '?') src += '.';
      else if (RE_SPECIAL.indexOf(c) !== -1) src += '\\' + c;
      else src += c;
    }
    return new RegExp(anchored ? '^' + src + '$' : src, 'i');
  }

  function literalRe(text, anchored) {
    var s = String(text), src = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (RE_SPECIAL.indexOf(c) !== -1 || c === '*' || c === '?') src += '\\' + c;
      else src += c;
    }
    return new RegExp(anchored ? '^' + src + '$' : src, 'i');
  }

  function makeMatcher(value, quoted, anchored) {
    return quoted ? literalRe(value, anchored) : globToRe(value, anchored);
  }

  /* note: { name, title, tags:[], expanded:{}, plain, raw, hasImage } */
  function evalNode(node, note) {
    switch (node.op) {
      case 'and': return evalNode(node.a, note) && evalNode(node.b, note);
      case 'or': return evalNode(node.a, note) || evalNode(node.b, note);
      case 'not': return !evalNode(node.a, note);
      case 'term': return evalTerm(node, note);
      default: return false;
    }
  }

  function anyMatch(list, re) {
    for (var i = 0; i < list.length; i++) if (re.test(list[i])) return true;
    return false;
  }

  function evalTerm(node, note) {
    var field = node.field, value = node.value;

    if (field === 'is') {
      var v = value.toLowerCase();
      if (v === 'untagged') return note.tags.length === 0;
      if (v === 'tagged') return note.tags.length > 0;
      if (v === 'empty') return !note.plain.trim();
      return false;
    }
    if (field === 'has') {
      var h = value.toLowerCase();
      if (h === 'image') return !!note.hasImage;
      if (h === 'tag') return note.tags.length > 0;
      if (h === 'link') return /\]\(|https?:\/\//.test(note.raw);
      if (h === 'code') return /```/.test(note.raw) || /^ {4,}\S/m.test(note.raw);
      return false;
    }
    if (field === 'title') return makeMatcher(value, node.quoted, false).test(note.title);
    if (field === 'file' || field === 'name') return makeMatcher(value, node.quoted, false).test(note.name);
    if (field === 'text' || field === 'body') return makeMatcher(value, node.quoted, false).test(note.plain);

    if (field === 'tag' || field === 'in') {
      var exact = value.charAt(0) === '=';
      var pat = exact ? value.slice(1) : value;
      var re = makeMatcher(pat.toLowerCase(), node.quoted, true);
      return exact ? anyMatch(note.tags, re) : anyMatch(Object.keys(note.expanded), re);
    }

    if (field === 'near') {
      var base = global.Tags.normalize(value);
      var want = Object.create(null);
      want[base] = true;
      global.Tags.siblingsOf(base).forEach(function (s) { want[s] = true; });
      Object.keys(want).slice().forEach(function (t) {
        var d = global.Tags.descendants(t);
        Object.keys(d).forEach(function (x) { want[x] = true; });
      });
      for (var i = 0; i < note.tags.length; i++) if (want[note.tags[i]]) return true;
      return false;
    }

    /* no field: title, body, filename and tags */
    var m = makeMatcher(value, node.quoted, false);
    if (m.test(note.title) || m.test(note.name) || m.test(note.plain)) return true;
    var mt = makeMatcher(value.toLowerCase(), node.quoted, true);
    return anyMatch(Object.keys(note.expanded), mt);
  }

  /* Literal fragments worth highlighting in the result list. */
  function highlights(node, out) {
    out = out || [];
    if (!node) return out;
    if (node.op === 'term') {
      if (node.field !== 'is' && node.field !== 'has' && node.value) out.push(node.value.replace(/^=/, ''));
    } else {
      if (node.a) highlights(node.a, out);
      if (node.b) highlights(node.b, out);
    }
    return out;
  }

  var Search = {
    parse: parse,
    /* Returns { ok, error, empty, test(note), terms[] } */
    compile: function (q) {
      var ast;
      try { ast = parse(q || ''); }
      catch (e) { return { ok: false, error: e.message, test: function () { return false; }, terms: [] }; }
      if (!ast) return { ok: true, empty: true, test: function () { return true; }, terms: [] };
      return {
        ok: true,
        ast: ast,
        terms: highlights(ast),
        test: function (note) {
          try { return evalNode(ast, note); } catch (e) { return false; }
        }
      };
    },
    globToRe: globToRe
  };

  global.Search = Search;
})(window);
