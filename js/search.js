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
 *
 * Dates (local time, day granularity unless a time is given). Written day
 * first - dd-mm-yyyy or dd/mm/yyyy - and year-first ISO is read as well:
 *   updated:02-08-2026      created:08-2026      date:2026
 *   updated:02/08/2026      updated:2026-08-02
 *   updated:01-08-2026..31-08-2026   open either end: updated:01-08-2026..
 *   created:>01-08-2026  >=  <  <=   before:08-2026  after:today  since:7d
 *   updated:today | yesterday | thisweek | thismonth | thisyear | 7d | 3w | 6m
 *   date: matches either date; is:undated finds notes with neither.
 */
(function (global) {
  'use strict';

  /* ---------------- tokenizer ---------------- */

  var T = { LP: 'LP', RP: 'RP', AND: 'AND', OR: 'OR', NOT: 'NOT', TERM: 'TERM', END: 'END' };

  /* Which date a field asks about, and the comparison it implies.
     'c' created, 'u' last modified, 'e' either of the two. */
  var DATE_FIELDS = {
    created: { which: 'c' },
    updated: { which: 'u' },
    modified: { which: 'u' },
    date: { which: 'e' },
    on: { which: 'e' },
    before: { which: 'e', op: '<' },
    after: { which: 'e', op: '>' },
    since: { which: 'e', op: '>=' },
    until: { which: 'e', op: '<=' }
  };

  var FIELDS = ['tag', 'title', 'text', 'body', 'file', 'name', 'is', 'has', 'near', 'in']
    .concat(Object.keys(DATE_FIELDS));

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

  /* ---------------- dates ----------------
   * Everything here works in local time and returns a half-open span
   * [from, to). A bare "2026-08" is a whole month, not an instant, which is
   * what makes "created:2026-08" and "before:2026-08" both read naturally.
   */

  var DAY = 86400000;

  function dayStart(y, m, d) { return new Date(y, m, d, 0, 0, 0, 0).getTime(); }
  function today0() {
    var n = new Date();
    return dayStart(n.getFullYear(), n.getMonth(), n.getDate());
  }

  /* "2026" | "2026-08" | "2026-08-02" | "2026-08-02T14:30" -> span */
  function parsePoint(s) {
    var m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2})(?:[t ](\d{1,2}):(\d{2})(?::(\d{2}))?)?)?)?$/.exec(s);
    if (!m) return null;
    var y = +m[1];
    if (m[2] === undefined) return { from: dayStart(y, 0, 1), to: dayStart(y + 1, 0, 1) };
    var mo = +m[2] - 1;
    if (m[3] === undefined) return { from: dayStart(y, mo, 1), to: dayStart(y, mo + 1, 1) };
    var d = +m[3];
    if (m[4] === undefined) return { from: dayStart(y, mo, d), to: dayStart(y, mo, d + 1) };
    var at = new Date(y, mo, d, +m[4], +m[5], m[6] ? +m[6] : 0, 0).getTime();
    return { from: at, to: at + (m[6] ? 1000 : 60000) };
  }

  /* The day-first way dates are written here:
     "02-08-2026" | "2-8-2026" | "08-2026" | "02-08-2026T14:30" -> span
     The four-digit year sits at the end, and that alone tells this shape from
     the year-first one above, so no date can ever be read for the other one.
     A month past 12 is refused rather than quietly rolled into next year:
     "08-13-2026" is a month-first date, and guessing at it would be worse
     than saying nothing. */
  function parsePointDayFirst(s) {
    var m = /^(\d{1,2})(?:-(\d{1,2}))?-(\d{4})(?:[t ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
    if (!m) return null;
    var y = +m[3];
    if (m[2] === undefined) {                       /* mm-yyyy: a whole month */
      var only = +m[1] - 1;
      if (only > 11) return null;
      return { from: dayStart(y, only, 1), to: dayStart(y, only + 1, 1) };
    }
    var d = +m[1], mo = +m[2] - 1;
    if (mo > 11 || d < 1 || d > 31) return null;
    if (m[4] === undefined) return { from: dayStart(y, mo, d), to: dayStart(y, mo, d + 1) };
    var at = new Date(y, mo, d, +m[4], +m[5], m[6] ? +m[6] : 0, 0).getTime();
    return { from: at, to: at + (m[6] ? 1000 : 60000) };
  }

  /* "today" | "yesterday" | "thisweek" | "7d" | "3w" | "6m" -> span */
  function parseKeyword(s) {
    var t0 = today0(), now = new Date(), m;
    if (s === 'today') return { from: t0, to: t0 + DAY };
    if (s === 'yesterday') return { from: t0 - DAY, to: t0 };
    if (s === 'tomorrow') return { from: t0 + DAY, to: t0 + 2 * DAY };
    if (s === 'week' || s === 'thisweek') {
      var back = (now.getDay() + 6) % 7;                 /* weeks start Monday */
      return { from: t0 - back * DAY, to: t0 - back * DAY + 7 * DAY };
    }
    if (s === 'month' || s === 'thismonth') {
      return {
        from: dayStart(now.getFullYear(), now.getMonth(), 1),
        to: dayStart(now.getFullYear(), now.getMonth() + 1, 1)
      };
    }
    if (s === 'year' || s === 'thisyear') {
      return { from: dayStart(now.getFullYear(), 0, 1), to: dayStart(now.getFullYear() + 1, 0, 1) };
    }
    if ((m = /^(?:last)?(\d{1,4})d(?:ays?)?$/.exec(s))) {
      return { from: t0 - (+m[1] - 1) * DAY, to: t0 + DAY };
    }
    if ((m = /^(?:last)?(\d{1,3})w(?:eeks?)?$/.exec(s))) {
      return { from: t0 - (+m[1] * 7 - 1) * DAY, to: t0 + DAY };
    }
    if ((m = /^(?:last)?(\d{1,3})m(?:onths?)?$/.exec(s))) {
      var back2 = new Date(t0);
      back2.setMonth(back2.getMonth() - (+m[1]));
      return { from: back2.getTime(), to: t0 + DAY };
    }
    if ((m = /^(?:last)?(\d{1,3})y(?:ears?)?$/.exec(s))) {
      var back3 = new Date(t0);
      back3.setFullYear(back3.getFullYear() - (+m[1]));
      return { from: back3.getTime(), to: t0 + DAY };
    }
    return null;
  }

  /* Slashes and dashes say the same thing, so 02/08/2026 and 02-08-2026 are
     one date written two ways. */
  function span(s) {
    var dated = s.replace(/\//g, '-');
    return parsePoint(dated) || parsePointDayFirst(dated) ||
      parseKeyword(s.replace(/[\s_\-\/]/g, ''));
  }

  /* The whole value grammar: a point, a a..b range, or a comparison. */
  function parseDateRange(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (!s) return null;

    var i = s.indexOf('..');
    if (i !== -1) {
      var a = s.slice(0, i).trim(), b = s.slice(i + 2).trim();
      if (!a && !b) return null;
      var lo = a ? span(a) : null, hi = b ? span(b) : null;
      if ((a && !lo) || (b && !hi)) return null;
      return { from: lo ? lo.from : -Infinity, to: hi ? hi.to : Infinity };
    }

    var m = /^(>=|<=|=>|=<|>|<|=)\s*(.+)$/.exec(s);
    if (m) {
      var p = span(m[2].trim());
      if (!p) return null;
      var op = m[1] === '=>' ? '>=' : m[1] === '=<' ? '<=' : m[1];
      if (op === '>') return { from: p.to, to: Infinity };
      if (op === '>=') return { from: p.from, to: Infinity };
      if (op === '<') return { from: -Infinity, to: p.from };
      if (op === '<=') return { from: -Infinity, to: p.to };
      return p;
    }
    return span(s);
  }

  function inSpan(t, r) { return !!t && t >= r.from && t < r.to; }

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

  /* note: { name, title, tags:[], expanded:{}, plain, raw, hasImage,
             created, updated } - the two dates are ms, 0 when unknown */
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
      if (v === 'undated') return !(note.created || note.updated);
      if (v === 'dated') return !!(note.created || note.updated);
      return false;
    }
    if (field === 'has') {
      var h = value.toLowerCase();
      if (h === 'image') return !!note.hasImage;
      if (h === 'tag') return note.tags.length > 0;
      if (h === 'link') return /\]\(|https?:\/\//.test(note.raw);
      if (h === 'code') return /```/.test(note.raw) || /^ {4,}\S/m.test(note.raw);
      if (h === 'date') return !!(note.created || note.updated);
      return false;
    }
    if (DATE_FIELDS[field]) {
      var spec = DATE_FIELDS[field], val = value;
      /* before:/after:/since:/until: are sugar - they supply the comparison
         the value does not carry itself */
      if (spec.op && !/^(>=|<=|=>|=<|>|<|=)/.test(val) && val.indexOf('..') === -1) val = spec.op + val;
      var range = parseDateRange(val);
      if (!range) return false;
      if (spec.which === 'c') return inSpan(note.created, range);
      if (spec.which === 'u') return inSpan(note.updated, range);
      return inSpan(note.created, range) || inSpan(note.updated, range);
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
      var skip = node.field === 'is' || node.field === 'has' || !!DATE_FIELDS[node.field];
      if (!skip && node.value) out.push(node.value.replace(/^=/, ''));
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
    globToRe: globToRe,
    /* shared with the home-page date pickers, which build these terms */
    dateFields: DATE_FIELDS,
    parseDateRange: parseDateRange
  };

  global.Search = Search;
})(window);
