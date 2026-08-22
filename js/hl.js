/* JoeNote - js/hl.js
 * Highlights, and the notes tied to them.
 *
 * A highlight is ==text== in the .md file. Its note rides directly behind
 * it in braces - ==text=={why this matters} - so the two are one unbroken
 * run of characters. Remove the highlight and the note goes with it; there
 * is nothing left over to reconcile, no sidecar file, no database.
 *
 * This module owns the file end of that: finding highlights in the source,
 * putting one in, taking one out, and asking Claude for a short summary.
 * Everything about menus and clicks lives in app.js.
 *
 * Public API:
 *   HL.scan(src)                  -> [{start, end, inner, note}, ...]
 *   HL.locate(src, text, ratio)   -> {start, end} | null
 *   HL.wrap(src, start, end, note)-> new source
 *   HL.remove(src, hl)            -> new source
 *   HL.setNote(src, hl, note)     -> new source
 *   HL.key() / HL.key(value)      -> the Anthropic key, in this browser only
 *   HL.summarize(text)            -> Promise<string>   (ten words or fewer)
 */
(function (global) {
  'use strict';

  var LS = 'joenote:';

  /* =========================== source scanning =========================
   * Everything below works on a masked copy of the note: front matter and
   * code are blanked out with NULs, same length, so offsets still line up
   * with the real file. It keeps a highlight from ever being written into
   * a fenced block, where == is just two characters of somebody's shell
   * script and would render as nothing.
   * =================================================================== */

  /* Two sentinels, because the two kinds of masked text differ in kind.
     HARD is ground a highlight must never touch - a fenced block, where ==
     is two characters of somebody's shell script. SOFT is machinery a
     highlight may legitimately straddle: the ](url) half of a link reads as
     nothing to the eye, so a selection running across one is fine to wrap -
     it just must not begin or end inside it. */
  var HARD = '\u0000';
  var SOFT = '\u0001';

  function blank(n, ch) { return new Array(n + 1).join(ch); }

  function mask(src) {
    var out = src;

    function hide(re, ch) {
      out = out.replace(re, function (m) { return blank(m.length, ch); });
    }

    /* front matter */
    out = out.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, function (m) {
      return blank(m.length, HARD);
    });
    hide(/^[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]{0,3}\1[ \t]*(?=\n|$)|$)/gm, HARD);
    hide(/^(?: {4}|\t)[^\n]*$/gm, HARD);                /* indented code */
    hide(/`[^`\n]*`/g, HARD);                           /* code spans */
    hide(/\]\([^)\s]*(?:[ \t]+"[^"]*")?\)/g, SOFT);     /* link and image targets */
    hide(/<[^>\n]{1,200}>/g, SOFT);                     /* raw html and autolinks */

    return out;
  }

  var RE_SCAN = /==(?!\s)([\s\S]*?[^\s=])==(?!=)(\{(?:\\.|[^\\}\n])*\})?/g;

  /* Every highlight in the note, in the order they appear. */
  function scan(src) {
    var masked = mask(src), out = [], m;
    RE_SCAN.lastIndex = 0;
    while ((m = RE_SCAN.exec(masked))) {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        inner: src.slice(m.index + 2, m.index + 2 + m[1].length),
        note: m[2] ? unescapeNote(src.slice(
          m.index + m[0].length - m[2].length + 1,
          m.index + m[0].length - 1)) : ''
      });
    }
    return out;
  }

  function unescapeNote(s) { return s.replace(/\\([\\}])/g, '$1'); }
  function escapeNote(s) {
    return String(s).replace(/[\\}]/g, '\\$&').replace(/\s*\r?\n\s*/g, ' ').trim();
  }

  /* ======================= finding the selected text ===================
   * The reader selects rendered text; we have to point at the same words
   * in the markdown behind it. The selection is looked for three ways, in
   * order of how much markup it is allowed to have swallowed:
   *
   *   1. exactly, give or take line breaks
   *   2. with emphasis marks between the words   (the **bold** word)
   *   3. with anything short between the words, inside one paragraph
   *      (a [link](http://…) in the middle)
   *
   * `ratio` is where the selection sat in the rendered note, 0 to 1. When
   * the same phrase appears more than once, the match nearest that spot in
   * the file wins - far more reliable than counting occurrences, because
   * code blocks and footnotes are rendered in a different order than they
   * are written.
   * ================================================================== */

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Every word is pinned to a word boundary. Without it a one-letter word
     ("a link mid sentence") matches inside "lazy", and the highlight lands
     three words to the left of what the reader actually swept over. */
  function word(w) {
    return (/\w/.test(w.charAt(0)) ? '\\b' : '') + esc(w) +
      (/\w/.test(w.charAt(w.length - 1)) ? '\\b' : '');
  }

  function pattern(text, tier) {
    var gap = tier === 1 ? '\\s+'
      : tier === 2 ? '[\\s*_~=`\\\\]+'
        : '(?:(?!\\n[ \\t]*\\n)[\\s\\S]){1,200}?';
    return new RegExp(text.trim().split(/\s+/).map(word).join(gap), 'g');
  }

  function locate(src, text, ratio) {
    var needle = String(text).replace(/\s+/g, ' ').trim();
    if (needle.length < 2) return null;
    var masked = mask(src);
    var taken = scan(src);
    var want = Math.round((ratio || 0) * src.length);

    for (var tier = 1; tier <= 3; tier++) {
      var re = pattern(needle, tier), m, best = null;
      while ((m = re.exec(masked))) {
        if (m[0].indexOf(HARD) !== -1) continue;               /* landed in code */
        if (m[0].length > needle.length * 2 + 120) continue;   /* swallowed too much */
        if (m[0][0] === SOFT || m[0].slice(-1) === SOFT) continue;  /* edge in markup */
        var hit = { start: m.index, end: m.index + m[0].length };
        if (overlaps(hit, taken)) continue;              /* already highlighted */
        if (!best || Math.abs(hit.start - want) < Math.abs(best.start - want)) best = hit;
        if (re.lastIndex === m.index) re.lastIndex++;
      }
      if (best) return best;
    }
    return null;
  }

  function overlaps(hit, list) {
    for (var i = 0; i < list.length; i++) {
      if (hit.start < list[i].end && list[i].start < hit.end) return true;
    }
    return false;
  }

  /* ============================ edits to the file ====================== */

  function wrap(src, start, end, note) {
    var taken = src.slice(start, end);
    /* keep any whitespace the selection swept up outside the marks */
    var lead = /^\s*/.exec(taken)[0];
    var tail = /\s*$/.exec(taken)[0];
    var body = taken.slice(lead.length, taken.length - tail.length);
    if (!body) return src;
    return src.slice(0, start) + lead + '==' + body + '==' +
      (note ? '{' + escapeNote(note) + '}' : '') + tail + src.slice(end);
  }

  function remove(src, hl) {
    return src.slice(0, hl.start) + hl.inner + src.slice(hl.end);
  }

  function setNote(src, hl, note) {
    var n = escapeNote(note || '');
    return src.slice(0, hl.start) + '==' + hl.inner + '==' +
      (n ? '{' + n + '}' : '') + src.slice(hl.end);
  }

  /* ========================= the ten-word summary ======================
   * JoeNote has no server, so the key lives in this browser's local
   * storage - the same place the GitHub token lives - and is sent only to
   * api.anthropic.com. Anthropic allows a browser to call it directly, but
   * only when the request says so out loud, hence the header below.
   * ================================================================== */

  var API = 'https://api.anthropic.com/v1/messages';
  var MODEL = 'claude-opus-5';

  function key(value) {
    if (arguments.length === 0) return localStorage.getItem(LS + 'ai:key') || '';
    if (value) localStorage.setItem(LS + 'ai:key', value);
    else localStorage.removeItem(LS + 'ai:key');
    return value || '';
  }

  function tenWords(s) {
    var words = String(s).replace(/\s+/g, ' ').trim()
      .replace(/^["'“‘]+|["'”’.]+$/g, '')
      .split(' ');
    return words.slice(0, 10).join(' ');
  }

  function summarize(text) {
    var k = key();
    if (!k) return Promise.reject(new Error('No Anthropic key yet — add one in AI…'));

    return fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': k,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        output_config: { effort: 'low' },
        system: 'You summarise a passage in under ten words. Reply with the ' +
          'summary alone: no preamble, no quotation marks, no trailing full ' +
          'stop, no explanation. Keep the wording of the passage where you can.',
        messages: [{ role: 'user', content: 'Summarise in under ten words:\n\n' + text }]
      })
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) {
          var msg = (data && data.error && data.error.message) || ('HTTP ' + r.status);
          throw new Error(msg);
        }
        return data;
      }, function () { throw new Error('HTTP ' + r.status); });
    }).then(function (data) {
      if (data.stop_reason === 'refusal') throw new Error('Claude declined to summarise that');
      var blocks = data.content || [];
      var out = '';
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].type === 'text') out += blocks[i].text;
      }
      out = tenWords(out);
      if (!out) throw new Error('Claude came back empty');
      return out;
    });
  }

  global.HL = {
    scan: scan,
    locate: locate,
    wrap: wrap,
    remove: remove,
    setNote: setNote,
    escapeNote: escapeNote,
    key: key,
    summarize: summarize,
    model: MODEL
  };
})(window);
