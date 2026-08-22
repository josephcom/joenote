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
 *   HL.plan(src, start, end)      -> [{start, end}, ...]  (one per piece)
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
   * in the markdown behind it. The selection is looked for four ways, in
   * order of how much markup it is allowed to have swallowed:
   *
   *   1. exactly, give or take line breaks
   *   2. with emphasis marks between the words   (the **bold** word)
   *   3. with anything short between the words, inside one paragraph
   *      (a [link](http://…) in the middle)
   *   4. with emphasis marks between any two letters ((**F**und **U**nder))
   *
   * `ratio` is where the selection sat in the rendered note, 0 to 1. When
   * the same phrase appears more than once, the match nearest that spot in
   * the file wins - far more reliable than counting occurrences, because
   * code blocks and footnotes are rendered in a different order than they
   * are written.
   * ================================================================== */

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Markup does not only fall between words, it falls inside them. A note
     that says *dollars*, has a star wedged between the word and its comma,
     and the reader who swept over "dollars," never saw it. So a word is
     broken at its own letter-and-punctuation seams too, and the same kind
     of gap is allowed at those seams as between two whole words.

     Every word is still pinned to a word boundary. Without it a one-letter
     word ("a link mid sentence") matches inside "lazy", and the highlight
     lands three words to the left of what the reader swept over. */
  function word(w, glue, letters) {
    var parts = letters ? w.split('') : (w.match(/\w+|[\s\S]/g) || [w]);
    var out = '';
    for (var i = 0; i < parts.length; i++) out += (i ? glue : '') + esc(parts[i]);
    return (/\w/.test(w.charAt(0)) ? '\\b' : '') + out +
      (/\w/.test(w.charAt(w.length - 1)) ? '\\b' : '');
  }

  /* Everything that can sit in the middle of a word and print as nothing:
     the emphasis and code marks, a backslash escape, the [ that opens a
     link, and the ](target) behind it, which mask() has already blanked to
     SOFT. A cross-reference written ([Section 5.5](#s55)). reads as eight
     plain characters and a bracket, and has five of these wedged through
     the middle of them. */
  var MARKUP = '*_~=`\\\\\\[\\u0001';

  /* gap: what may sit between two words. glue: what may sit inside one.
     letters: whether the glue is allowed between any two letters, which is
     the last thing tried, for a note that bolds a single initial the way
     (**F**und **U**nder **M**anagement) does. */
  var TIERS = [
    { gap: '\\s+', glue: '' },
    { gap: '[\\s' + MARKUP + ']+', glue: '[' + MARKUP + ']*' },
    { gap: '(?:(?!\\n[ \\t]*\\n)[\\s\\S]){1,200}?', glue: '[' + MARKUP + ']*' },
    { gap: '[\\s' + MARKUP + ']+', glue: '[' + MARKUP + ']*', letters: true }
  ];

  function pattern(text, tier) {
    var t = TIERS[tier - 1];
    return new RegExp(text.trim().split(/\s+/).map(function (w) {
      return word(w, t.glue, t.letters);
    }).join(t.gap), 'g');
  }

  function locate(src, text, ratio) {
    var needle = String(text).replace(/\s+/g, ' ').trim();
    if (needle.length < 2) return null;
    var masked = mask(src);
    var taken = scan(src);
    var want = Math.round((ratio || 0) * src.length);

    for (var tier = 1; tier <= TIERS.length; tier++) {
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

  /* ==text== cannot cross a blank line or a list bullet: markdown ends the
     paragraph there, and the marks are left stranded on either side of the
     gap, printed as literal = signs. So a selection running over several
     paragraphs is cut at those seams and each piece is marked in its own
     right. The note goes on the first piece - it is where the eye lands,
     and the one you reach for to take the note away again. */

  var RE_BLOCK_START = /^(?:[ \t]*$|[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]|[ \t]{0,3}#{1,6}[ \t]|[ \t]*>|[ \t]{0,3}(?:`{3,}|~{3,})|[ \t]{0,3}(?:=+|-+)[ \t]*$)/;

  /* Quotes, then bullets, then at most one hash, and nothing after the hash:
     in "### 5. So why does the money go there?" the 5. is the heading
     talking, not a numbered list. Letting the run go round again ate it, and
     the highlight came back starting one clause late. */
  var RE_MARKER = /^(?:[ \t]*>[ \t]?)*(?:[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]+)*(?:[ \t]{0,3}#{1,6}[ \t]+)?/;

  function segments(src, start, end) {
    var lines = src.slice(start, end).split('\n');
    var out = [], at = start, from = null, to = null;
    /* whether the selection began where its first line began, or part-way
       along it - see the marker test below */
    var opensLine = start === 0 || src.charAt(start - 1) === '\n';

    function close() {
      if (from === null) return;
      var piece = src.slice(from, to);
      var lead = /^\s*/.exec(piece)[0], tail = /\s*$/.exec(piece)[0];
      if (piece.length > lead.length + tail.length) {
        out.push({ start: from + lead.length, end: to - tail.length });
      }
      from = to = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], lineEnd = at + line.length;
      /* notes written on Windows carry a \r that is part of the line but not
         part of what the line says, so it is dropped before the block test -
         otherwise a blank line reads as "\r" and no paragraph ever ends */
      var said = line.replace(/\r$/, '');
      /* the first line is whatever the selection began part-way through, so
         it never counts as opening a block of its own */
      if (i > 0 && RE_BLOCK_START.test(said)) close();
      if (said.trim()) {
        /* a piece that opens on a list bullet, a heading or a quote must
           start after the marker: ==2. text== is not a numbered item any
           more, it is the previous item with two literal = signs in it.

           Only where the line really does open there, though. In the
           heading "### 5. So why does the money go there?" a reader who
           sweeps from the 5 hands us a first line reading "5. So why does",
           and that 5. is the heading talking. Stripping it as a bullet lost
           the first two characters of every such highlight. */
        if (from === null) {
          from = at + ((i > 0 || opensLine) ? RE_MARKER.exec(said)[0].length : 0);
        }
        to = lineEnd;
      }
      at = lineEnd + 1;
    }
    close();
    return out;
  }

  /* ============================ inline seams ==========================
   * segments() cuts a selection where markdown ends a paragraph. This cuts
   * it where markdown ends a *word*, and for the same reason: a pair of ==
   * marks has to nest with the markup it lands in.
   *
   * Take a sentence that opens in bold and runs on out of it:
   *
   *     **judge by supply.** Demand seduces.
   *
   * and sweep from "judge" to "seduces". Wrapping that span where it sits
   * threads the marks through the bold - **==judge by supply.** Demand
   * seduces.== - and interleaved delimiters are not something markdown can
   * say. All four characters print as themselves and the reader gets two
   * runs of punctuation in the middle of a sentence and no highlight.
   *
   * Two ways out, tried in that order. Where a mark can be stepped outwards
   * over characters that print as nothing - the ** itself - it is, and the
   * highlight then encloses the bold whole while still covering exactly the
   * words that were swept. Where it cannot, because some of the bold was
   * already there before the selection began, the selection is cut at the
   * seam and each side marked in its own right.
   * ================================================================== */

  /* Where the paragraph around a span begins and ends. Emphasis cannot
     cross a blank line, so there is nothing outside this to pair with. */
  function paraBounds(masked, s, e) {
    var re = /\n[ \t]*\r?\n/g, from = 0, to = masked.length, m;
    while ((m = re.exec(masked))) {
      var after = m.index + m[0].length;
      if (after <= s) from = after;
      else if (m.index >= e) { to = m.index; break; }
    }
    return { from: from, to: to };
  }

  /* The emphasis in one paragraph, as opener/closer pairs. This is the
     CommonMark rule at its simplest: a run of marks can open if a word
     follows it and can close if a word precedes it, and a closer takes the
     nearest opener still waiting. It does not have to be perfect. Whatever
     it gets wrong is caught downstream, where the note is re-rendered and
     has to read back character for character before a byte is written. */
  var EM = ['*', '_', '~'];

  function delimPairs(masked, from, to) {
    var out = [], k, i;

    for (k = 0; k < EM.length; k++) {
      var ch = EM[k];
      var re = new RegExp('\\' + ch + '+', 'g');
      re.lastIndex = from;
      var runs = [], m;
      while ((m = re.exec(masked)) && m.index < to) {
        var a = m.index, b = a + m[0].length;
        var prev = a > from ? masked.charAt(a - 1) : '';
        var next = b < to ? masked.charAt(b) : '';
        var opens = !!next && !/\s/.test(next);
        var closes = !!prev && !/\s/.test(prev);
        /* _inside_a_word_ is not emphasis, it is somebody's variable name */
        if (ch === '_') {
          if (/\w/.test(prev)) opens = false;
          if (/\w/.test(next)) closes = false;
        }
        /* only ~~ strikes through; a lone ~ is a tilde */
        if (ch === '~' && b - a !== 2) { opens = false; closes = false; }
        runs.push({ a: a, b: b, left: b - a, opens: opens, closes: closes });
      }

      /* A run of marks is not one delimiter, it is as many as it is long,
         and a closer takes them from the openers still waiting one at a
         time. ***both at once*** ends on a run of three that closes a run
         of one wrapped round a run of two; popping whole runs pairs the
         wrong ends and leaves the italic looking as if it never closed. */
      var stack = [];
      for (i = 0; i < runs.length; i++) {
        var r = runs[i];
        if (r.closes) {
          while (r.left > 0 && stack.length) {
            var o = stack[stack.length - 1];
            var use = Math.min(o.left, r.left);
            out.push({
              oa: o.a + o.left - use, ob: o.a + o.left,
              ca: r.b - r.left, cb: r.b - r.left + use
            });
            o.left -= use;
            r.left -= use;
            if (o.left === 0) stack.pop();
          }
        }
        if (r.opens && r.left > 0) stack.push(r);
      }
    }

    /* Link and image text. The ](target) half is already masked SOFT, so a
       link is a [ and a run of SOFT - the nearest [ still waiting, not the
       first one in the paragraph. A task list writes "- [ ] do the thing",
       and that empty checkbox was claiming the target of whatever link came
       next, which put a seam through the middle of an innocent sentence. */
    var br = /\[|\u0001+/g, mb, bras = [];
    br.lastIndex = from;
    while ((mb = br.exec(masked)) && mb.index < to) {
      if (mb[0].charAt(0) === '[') { bras.push(mb.index); continue; }
      if (!bras.length) continue;
      var oa = bras.pop();
      out.push({ oa: oa, ob: oa + 1, ca: mb.index, cb: mb.index + mb[0].length });
    }

    return out;
  }

  /* A piece worth marking has something in it that prints. */
  function speaks(src, start, end) {
    return /[^\s*_~[\]]/.test(src.slice(start, end));
  }

  function settle(src, masked, start, end, out, depth) {
    if (start >= end || depth > 8) {
      if (end > start && speaks(src, start, end)) out.push({ start: start, end: end });
      return out;
    }

    var para = paraBounds(masked, start, end);
    var pairs = delimPairs(masked, para.from, para.to);

    /* stepping one mark outwards can bring the span up against the next
       piece of markup along, so the set is walked again until a pass
       changes nothing */
    for (var pass = 0; pass < 8; pass++) {
      var moved = false;
      for (var i = 0; i < pairs.length; i++) {
        var q = pairs[i];

        /* the span begins inside this construct and ends outside it */
        if (q.oa < start && start < q.cb && end >= q.cb) {
          if (start <= q.ob) { start = q.oa; moved = true; continue; }
          settle(src, masked, start, q.ca, out, depth + 1);
          settle(src, masked, q.cb, end, out, depth + 1);
          return out;
        }

        /* the span ends inside this construct, having begun outside it */
        if (start <= q.oa && q.oa < end && end < q.cb) {
          if (end >= q.ca) { end = q.cb; moved = true; continue; }
          settle(src, masked, start, q.oa, out, depth + 1);
          settle(src, masked, q.ob, end, out, depth + 1);
          return out;
        }
      }
      if (!moved) break;
    }

    if (speaks(src, start, end)) out.push({ start: start, end: end });
    return out;
  }

  /* Every piece of file a selection turns into: cut at the paragraph seams
     first, then at the seams inside each paragraph. */
  function plan(src, start, end) {
    var masked = mask(src);
    var blocks = segments(src, start, end);
    var out = [], i;
    for (i = 0; i < blocks.length; i++) {
      settle(src, masked, blocks[i].start, blocks[i].end, out, 0);
    }
    if (!out.length) return blocks;

    /* stepping a mark outwards must never step it onto a highlight that is
       already there - better to leave the selection where it was and let
       the check downstream turn it down */
    var taken = scan(src);
    for (i = 0; i < out.length; i++) {
      if (overlaps(out[i], taken)) return blocks;
    }
    return out;
  }

  /* Applied back to front, so an earlier span's offsets are still good once
     a later one has been rewritten. */
  function wrapAll(src, spans, note) {
    var out = src;
    for (var i = spans.length - 1; i >= 0; i--) {
      out = wrap(out, spans[i].start, spans[i].end, i === 0 ? note : '');
    }
    return out;
  }

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
    segments: segments,
    plan: plan,
    wrapAll: wrapAll,
    remove: remove,
    setNote: setNote,
    escapeNote: escapeNote,
    key: key,
    summarize: summarize,
    model: MODEL
  };
})(window);
