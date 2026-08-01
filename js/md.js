/* JoeNote - js/md.js
 * Dependency-free Markdown -> HTML.
 * CommonMark core + GFM (tables, task lists, strikethrough, autolinks,
 * footnotes) + JoeNote #hashtags.
 *
 * Public API:
 *   MD.render(src)        -> html string
 *   MD.extractTags(src)   -> ["tag", ...] (lowercased, de-duped, in order)
 *   MD.firstHeading(src)  -> string | null
 *   MD.stripFrontMatter(src) -> { meta: {}, body: "" }
 */
(function (global) {
  'use strict';

  /* ================================================================
   * Helpers
   * ================================================================ */

  var UNICODE_PUNCT = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u2010-\u2027\u2030-\u205E\u2E00-\u2E7F\u3001-\u3003\u3008-\u3011\u3014-\u301F\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D]/;

  function isPunct(ch) { return ch ? UNICODE_PUNCT.test(ch) : false; }
  function isSpace(ch) { return ch === undefined || ch === null || /\s/.test(ch); }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }
  function escAttr(s) { return escHtml(s).replace(/'/g, '&#39;'); }

  /* URLs that are never allowed through. */
  function safeURL(url) {
    var u = String(url == null ? '' : url).trim();
    var probe = u.replace(/[\u0000-\u0020]/g, '').toLowerCase();
    if (/^javascript:/.test(probe)) return '';
    if (/^vbscript:/.test(probe)) return '';
    if (/^data:/.test(probe) && !/^data:image\/(png|jpeg|jpg|gif|webp|avif);/.test(probe)) return '';
    return u;
  }

  /* Entity decoding: use the browser when we have one, else a small table. */
  var NAMED = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
    copy: '\u00a9', reg: '\u00ae', trade: '\u2122', hellip: '\u2026',
    mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201c', rdquo: '\u201d', laquo: '\u00ab', raquo: '\u00bb',
    deg: '\u00b0', plusmn: '\u00b1', times: '\u00d7', divide: '\u00f7',
    middot: '\u00b7', bull: '\u2022', dagger: '\u2020', para: '\u00b6',
    sect: '\u00a7', euro: '\u20ac', pound: '\u00a3', yen: '\u00a5',
    cent: '\u00a2', larr: '\u2190', rarr: '\u2192', uarr: '\u2191',
    darr: '\u2193', harr: '\u2194', infin: '\u221e', ne: '\u2260',
    le: '\u2264', ge: '\u2265', frac12: '\u00bd', frac14: '\u00bc'
  };
  var _decoder = null;
  function decodeEntity(text) {
    var m = /^&#[xX]([0-9a-fA-F]{1,6});$/.exec(text);
    if (m) return codePoint(parseInt(m[1], 16));
    m = /^&#([0-9]{1,7});$/.exec(text);
    if (m) return codePoint(parseInt(m[1], 10));
    m = /^&([a-zA-Z][a-zA-Z0-9]{1,31});$/.exec(text);
    if (!m) return text;
    if (NAMED[m[1]]) return NAMED[m[1]];
    if (typeof document !== 'undefined') {
      if (!_decoder) _decoder = document.createElement('textarea');
      _decoder.innerHTML = text;
      var v = _decoder.value;
      if (v !== text) return v;
    }
    return text;
  }
  function codePoint(n) {
    if (!n || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return '\ufffd';
    return String.fromCodePoint(n);
  }

  var RE_ENTITY = /^&(?:#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/;
  var ESCAPABLE = /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/;

  function unescapeString(s) {
    return s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1')
      .replace(/&(?:#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, decodeEntity);
  }

  function normalizeLabel(s) {
    return s.replace(/[ \t\r\n]+/g, ' ').trim().toLowerCase();
  }

  function slugify(s) {
    return String(s).toLowerCase().replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u00c0-\uffff\- ]+/g, '').trim()
      .replace(/ +/g, '-').replace(/-+/g, '-') || 'section';
  }

  /* ================================================================
   * Front matter (optional, YAML-ish, key: value only)
   * ================================================================ */

  function stripFrontMatter(src) {
    var meta = {}, body = src;
    var m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
    if (m) {
      body = src.slice(m[0].length);
      m[1].split(/\r?\n/).forEach(function (line) {
        var kv = /^([A-Za-z0-9_\-]+)[ \t]*:[ \t]*(.*)$/.exec(line);
        if (!kv) return;
        var val = kv[2].trim().replace(/^["'](.*)["']$/, '$1');
        meta[kv[1]] = val;
      });
    }
    return { meta: meta, body: body };
  }

  /* ================================================================
   * Block parsing
   * ================================================================ */

  var RE_HR = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
  var RE_ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
  var RE_FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;
  var RE_BQ = /^ {0,3}>/;
  var RE_SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
  var RE_FOOTNOTE_DEF = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]*(.*)$/;
  var RE_TABLE_DELIM = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

  var HTML_BLOCK_TAGS = ('address article aside base basefont blockquote body caption center col ' +
    'colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset ' +
    'h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem nav noframes ' +
    'ol optgroup option p param section source summary table tbody td tfoot th thead title tr track ul')
    .split(' ');

  function leading(line) {
    var n = 0;
    while (n < line.length && line[n] === ' ') n++;
    return n;
  }
  function isBlank(line) { return /^[ \t]*$/.test(line); }

  function itemInfo(line) {
    if (RE_HR.test(line)) return null;
    var m, indent, markerLen, ordered, start = 1, delim = null, bullet = null, spaces, rest, emptyItem;
    if ((m = /^( {0,3})(\d{1,9})([.)])(?:( +)|$)/.exec(line))) {
      indent = m[1].length; start = parseInt(m[2], 10); delim = m[3];
      markerLen = m[2].length + 1; ordered = true;
      spaces = m[4] ? m[4].length : 0;
      emptyItem = m[4] === undefined || isBlank(line.slice(indent + markerLen + spaces));
    } else if ((m = /^( {0,3})([-+*])(?:( +)|$)/.exec(line))) {
      indent = m[1].length; bullet = m[2]; markerLen = 1; ordered = false;
      spaces = m[3] ? m[3].length : 0;
      emptyItem = m[3] === undefined || isBlank(line.slice(indent + markerLen + spaces));
    } else {
      return null;
    }
    var contentIndent;
    if (emptyItem || spaces > 4) contentIndent = indent + markerLen + 1;
    else contentIndent = indent + markerLen + spaces;
    rest = line.slice(Math.min(contentIndent, line.length));
    return {
      indent: indent, ordered: ordered, start: start, delim: delim, bullet: bullet,
      contentIndent: contentIndent, rest: rest, empty: emptyItem
    };
  }

  function isBlockStart(line) {
    return RE_HR.test(line) || RE_ATX.test(line) || RE_FENCE.test(line) ||
      RE_BQ.test(line) || itemInfo(line) !== null || htmlBlockStart(line) !== null;
  }

  function htmlBlockStart(line) {
    var s = line.replace(/^ {0,3}/, '');
    if (s[0] !== '<') return null;
    if (/^<!--/.test(s)) return { end: /-->/ };
    if (/^<\?/.test(s)) return { end: /\?>/ };
    if (/^<!\[CDATA\[/.test(s)) return { end: /\]\]>/ };
    if (/^<![A-Za-z]/.test(s)) return { end: />/ };
    if (/^<\/?(?:script|pre|style|textarea)[\s>\/]/i.test(s)) return { end: /<\/(?:script|pre|style|textarea)>/i };
    var m = /^<\/?([A-Za-z][A-Za-z0-9-]*)[\s>\/]/.exec(s) || /^<\/?([A-Za-z][A-Za-z0-9-]*)>$/.exec(s);
    if (m && HTML_BLOCK_TAGS.indexOf(m[1].toLowerCase()) !== -1) return { end: null };
    if (/^<[A-Za-z][A-Za-z0-9-]*(\s+[^<>]*)?\/?>[ \t]*$/.test(s) || /^<\/[A-Za-z][A-Za-z0-9-]*[ \t]*>[ \t]*$/.test(s)) {
      return { end: null };
    }
    return null;
  }

  /* Link reference definitions are pulled off the front of paragraph text. */
  function consumeRefDefs(text, refs) {
    var re = /^[ \t]*\[((?:\\.|[^\\\[\]]|\\\n)+)\][ \t]*:[ \t]*(?:\r?\n[ \t]*)?(<[^<>\n]*>|[^\s<][^\s]*)(?:[ \t]+(?:\r?\n[ \t]*)?("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?[ \t]*(?:\r?\n|$)/;
    var m;
    while ((m = re.exec(text))) {
      var label = normalizeLabel(m[1]);
      if (!label) break;
      var dest = m[2];
      if (dest[0] === '<' && dest[dest.length - 1] === '>') dest = dest.slice(1, -1);
      var title = m[3] ? m[3].slice(1, -1) : null;
      if (!(label in refs)) refs[label] = { dest: unescapeString(dest), title: title ? unescapeString(title) : null };
      text = text.slice(m[0].length);
    }
    return text;
  }

  function splitRow(line) {
    var s = line.trim();
    if (s[0] === '|') s = s.slice(1);
    if (s[s.length - 1] === '|' && !/\\\|$/.test(s)) s = s.slice(0, -1);
    var cells = [], cur = '', i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === '\\' && s[i + 1] === '|') { cur += '|'; i += 2; continue; }
      if (c === '|') { cells.push(cur.trim()); cur = ''; i++; continue; }
      cur += c; i++;
    }
    cells.push(cur.trim());
    return cells;
  }

  function parseBlocks(lines, ctx) {
    var blocks = [], i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (isBlank(line)) { i++; continue; }

      /* Thematic break */
      if (RE_HR.test(line)) { blocks.push({ t: 'hr' }); i++; continue; }

      /* ATX heading */
      var m = RE_ATX.exec(line);
      if (m) {
        var txt = (m[2] || '').replace(/(^|[ \t])#+[ \t]*$/, '');
        blocks.push({ t: 'heading', level: m[1].length, text: txt.trim() });
        i++; continue;
      }

      /* Fenced code */
      m = RE_FENCE.exec(line);
      if (m) {
        var pad = m[1].length, fence = m[2], info = m[3].trim();
        if (!(fence[0] === '`' && info.indexOf('`') !== -1)) {
          var buf = [];
          i++;
          while (i < lines.length) {
            var cm = RE_FENCE.exec(lines[i]);
            if (cm && cm[2][0] === fence[0] && cm[2].length >= fence.length && cm[3].trim() === '') { i++; break; }
            var l = lines[i];
            var strip = 0;
            while (strip < pad && l[strip] === ' ') strip++;
            buf.push(l.slice(strip));
            i++;
          }
          blocks.push({ t: 'code', info: unescapeString(info), text: buf.join('\n') });
          continue;
        }
      }

      /* Footnote definition */
      m = RE_FOOTNOTE_DEF.exec(line);
      if (m) {
        var fid = m[1], fbuf = [m[2]];
        i++;
        while (i < lines.length) {
          if (isBlank(lines[i])) {
            var j = i;
            while (j < lines.length && isBlank(lines[j])) j++;
            if (j < lines.length && leading(lines[j]) >= 4) { fbuf.push(''); i = j; continue; }
            break;
          }
          if (leading(lines[i]) >= 4) { fbuf.push(lines[i].slice(4)); i++; continue; }
          if (!isBlockStart(lines[i]) && !RE_FOOTNOTE_DEF.test(lines[i])) { fbuf.push(lines[i].trim()); i++; continue; }
          break;
        }
        ctx.footnotes.push({ id: fid, blocks: parseBlocks(fbuf, ctx) });
        continue;
      }

      /* Blockquote (with lazy continuation) */
      if (RE_BQ.test(line)) {
        var qbuf = [];
        while (i < lines.length) {
          if (RE_BQ.test(lines[i])) {
            qbuf.push(lines[i].replace(/^ {0,3}> ?/, ''));
            i++; continue;
          }
          if (isBlank(lines[i])) break;
          if (isBlockStart(lines[i])) break;
          qbuf.push(lines[i]);           /* lazy paragraph continuation */
          i++;
        }
        blocks.push({ t: 'quote', blocks: parseBlocks(qbuf, ctx) });
        continue;
      }

      /* List */
      var first = itemInfo(line);
      if (first) {
        var list = { t: 'list', ordered: first.ordered, start: first.start, tight: true, items: [] };
        var loose = false;
        while (i < lines.length) {
          var info = itemInfo(lines[i]);
          if (!info || info.ordered !== list.ordered) break;
          if (list.ordered ? info.delim !== first.delim : info.bullet !== first.bullet) break;
          if (info.indent >= 4) break;

          var ibuf = [info.rest];
          i++;
          var blanks = 0, sawInternalBlank = false;
          while (i < lines.length) {
            var cur = lines[i];
            if (isBlank(cur)) { blanks++; ibuf.push(''); i++; continue; }
            if (leading(cur) >= info.contentIndent) {
              if (blanks > 0) sawInternalBlank = true;
              blanks = 0;
              ibuf.push(cur.slice(info.contentIndent));
              i++; continue;
            }
            if (blanks === 0 && !itemInfo(cur) && !isBlockStart(cur)) { ibuf.push(cur.replace(/^ +/, '')); i++; continue; }
            break;
          }
          var trailing = 0;
          while (ibuf.length && ibuf[ibuf.length - 1] === '') { ibuf.pop(); trailing++; }
          if (sawInternalBlank) loose = true;
          if (trailing > 0 && i < lines.length && itemInfo(lines[i])) loose = true;

          var item = { blocks: parseBlocks(ibuf, ctx), task: null };
          var tm = /^\[([ xX])\][ \t]+/.exec(ibuf[0] || '');
          if (tm && item.blocks.length && item.blocks[0].t === 'para') {
            item.task = tm[1].toLowerCase() === 'x';
            item.blocks[0].text = item.blocks[0].text.replace(/^\[([ xX])\][ \t]+/, '');
          }
          list.items.push(item);
        }
        list.tight = !loose;
        blocks.push(list);
        continue;
      }

      /* Table (GFM) */
      if (line.indexOf('|') !== -1 && i + 1 < lines.length && RE_TABLE_DELIM.test(lines[i + 1]) &&
        lines[i + 1].indexOf('|') !== -1) {
        var head = splitRow(line);
        var delimCells = splitRow(lines[i + 1]);
        if (head.length === delimCells.length) {
          var align = delimCells.map(function (c) {
            var l = c[0] === ':', r = c[c.length - 1] === ':';
            return l && r ? 'center' : r ? 'right' : l ? 'left' : null;
          });
          i += 2;
          var rows = [];
          while (i < lines.length && !isBlank(lines[i]) && lines[i].indexOf('|') !== -1 && !isBlockStart(lines[i])) {
            var cells = splitRow(lines[i]);
            while (cells.length < head.length) cells.push('');
            rows.push(cells.slice(0, head.length));
            i++;
          }
          blocks.push({ t: 'table', head: head, align: align, rows: rows });
          continue;
        }
      }

      /* Indented code block */
      if (leading(line) >= 4) {
        var cbuf = [];
        while (i < lines.length) {
          if (isBlank(lines[i])) {
            var k = i;
            while (k < lines.length && isBlank(lines[k])) k++;
            if (k < lines.length && leading(lines[k]) >= 4) {
              while (i < k) { cbuf.push(''); i++; }
              continue;
            }
            break;
          }
          if (leading(lines[i]) < 4) break;
          cbuf.push(lines[i].slice(4));
          i++;
        }
        blocks.push({ t: 'code', info: '', text: cbuf.join('\n') });
        continue;
      }

      /* HTML block */
      var hb = htmlBlockStart(line);
      if (hb) {
        var hbuf = [line];
        i++;
        if (hb.end) {
          if (!hb.end.test(line)) {
            while (i < lines.length) { hbuf.push(lines[i]); if (hb.end.test(lines[i])) { i++; break; } i++; }
          }
        } else {
          while (i < lines.length && !isBlank(lines[i])) { hbuf.push(lines[i]); i++; }
        }
        blocks.push({ t: 'html', text: hbuf.join('\n') });
        continue;
      }

      /* Paragraph / setext heading */
      var pbuf = [];
      var heading = 0;
      while (i < lines.length) {
        if (isBlank(lines[i])) break;
        if (pbuf.length) {
          /* a setext underline beats a thematic break / list interpretation */
          var sm = RE_SETEXT.exec(lines[i]);
          if (sm) { heading = sm[1][0] === '=' ? 1 : 2; i++; break; }
          if (isBlockStart(lines[i])) break;
        }
        pbuf.push(lines[i]);
        i++;
      }
      var ptext = pbuf.join('\n');
      ptext = consumeRefDefs(ptext, ctx.refs);
      ptext = ptext.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
      if (!ptext) continue;
      if (heading) blocks.push({ t: 'heading', level: heading, text: ptext });
      else blocks.push({ t: 'para', text: ptext });
    }

    return blocks;
  }

  /* ================================================================
   * Inline parsing (CommonMark delimiter-stack algorithm)
   * ================================================================ */

  function Node(t, v) { this.t = t; this.v = v; this.prev = null; this.next = null; this.kids = null; }

  function InlineParser(ctx) {
    this.ctx = ctx;
  }

  InlineParser.prototype.parse = function (src) {
    this.src = src;
    this.pos = 0;
    this.head = new Node('root', '');
    this.tail = this.head;
    this.delims = null;   /* top of delimiter stack */
    this.brackets = null; /* top of bracket stack */

    while (this.pos < this.src.length) {
      if (!this.step()) {
        this.addText(this.src[this.pos]);
        this.pos++;
      }
    }
    this.processEmphasis(null);
    return serialize(this.head.next, this.ctx);
  };

  InlineParser.prototype.add = function (node) {
    node.prev = this.tail;
    this.tail.next = node;
    this.tail = node;
    return node;
  };

  /* Note: never merge into a node that a delimiter or bracket points at -
     those nodes get sliced up later and must keep exactly their own run. */
  InlineParser.prototype.addText = function (s) {
    if (this.tail.t === 'text' && !this.tail.pinned) this.tail.v += s;
    else this.add(new Node('text', s));
  };

  InlineParser.prototype.step = function () {
    var src = this.src, c = src[this.pos];
    switch (c) {
      case '\n': return this.parseNewline();
      case '\\': return this.parseBackslash();
      case '`': return this.parseCode();
      case '*': case '_': case '~': return this.parseDelimRun(c);
      case '[': return this.parseOpenBracket();
      case '!': return this.parseBang();
      case ']': return this.parseCloseBracket();
      case '<': return this.parseAutolinkOrHtml();
      case '&': return this.parseEntity();
      case '#': return this.parseHashtag();
      case ':': return this.parseEmoji();
      default:
        if (c === 'h' || c === 'w' || c === 'f' || c === 'm') return this.parseBareLink();
        return false;
    }
  };

  InlineParser.prototype.parseNewline = function () {
    var t = this.tail;
    if (t.t === 'text' && /  $/.test(t.v)) {
      t.v = t.v.replace(/ +$/, '');
      this.add(new Node('hardbreak', ''));
    } else {
      if (t.t === 'text') t.v = t.v.replace(/ +$/, '');
      this.add(new Node('softbreak', ''));
    }
    this.pos++;
    while (this.src[this.pos] === ' ') this.pos++;
    return true;
  };

  InlineParser.prototype.parseBackslash = function () {
    var next = this.src[this.pos + 1];
    if (next === '\n') { this.add(new Node('hardbreak', '')); this.pos += 2; return true; }
    if (next && ESCAPABLE.test(next)) { this.addText(next); this.pos += 2; return true; }
    this.addText('\\'); this.pos++; return true;
  };

  InlineParser.prototype.parseCode = function () {
    var src = this.src, start = this.pos, n = 0;
    while (src[this.pos] === '`') { n++; this.pos++; }
    var contentStart = this.pos;
    while (this.pos < src.length) {
      if (src[this.pos] === '`') {
        var run = 0, at = this.pos;
        while (src[this.pos] === '`') { run++; this.pos++; }
        if (run === n) {
          var code = src.slice(contentStart, at).replace(/\n/g, ' ');
          if (/^ .* $/.test(code) && /[^ ]/.test(code)) code = code.slice(1, -1);
          this.add(new Node('code', code));
          return true;
        }
        continue;
      }
      this.pos++;
    }
    this.pos = start + n;
    this.addText(src.slice(start, this.pos));
    return true;
  };

  InlineParser.prototype.parseDelimRun = function (c) {
    var src = this.src, start = this.pos, count = 0;
    while (src[this.pos] === c) { count++; this.pos++; }
    var before = start > 0 ? src[start - 1] : '\n';
    var after = this.pos < src.length ? src[this.pos] : '\n';
    var beforeWs = isSpace(before), afterWs = isSpace(after);
    var beforePunct = isPunct(before), afterPunct = isPunct(after);
    var left = !afterWs && (!afterPunct || beforeWs || beforePunct);
    var right = !beforeWs && (!beforePunct || afterWs || afterPunct);
    var canOpen, canClose;
    if (c === '_') {
      canOpen = left && (!right || beforePunct);
      canClose = right && (!left || afterPunct);
    } else if (c === '~') {
      if (count > 2) { this.addText(src.slice(start, this.pos)); return true; }
      canOpen = left; canClose = right;
    } else {
      canOpen = left; canClose = right;
    }
    var node = this.add(new Node('text', src.slice(start, this.pos)));
    node.pinned = true;
    if (canOpen || canClose) {
      this.delims = {
        cc: c, num: count, orig: count, node: node,
        canOpen: canOpen, canClose: canClose, prev: this.delims, next: null
      };
      if (this.delims.prev) this.delims.prev.next = this.delims;
    }
    return true;
  };

  InlineParser.prototype.parseOpenBracket = function () {
    /* Footnote reference [^id] */
    var fm = /^\[\^([^\]\s]+)\]/.exec(this.src.slice(this.pos));
    if (fm) {
      this.add(new Node('fnref', fm[1]));
      this.ctx.usedFootnotes.push(fm[1]);
      this.pos += fm[0].length;
      return true;
    }
    var node = this.add(new Node('text', '['));
    node.pinned = true;
    this.pushBracket(node, false);
    this.pos++;
    return true;
  };

  InlineParser.prototype.parseBang = function () {
    if (this.src[this.pos + 1] === '[') {
      var node = this.add(new Node('text', '!['));
      node.pinned = true;
      this.pushBracket(node, true);
      this.pos += 2;
      return true;
    }
    return false;
  };

  InlineParser.prototype.pushBracket = function (node, image) {
    if (this.brackets) this.brackets.bracketAfter = true;
    this.brackets = {
      node: node, prev: this.brackets, prevDelim: this.delims,
      image: image, active: true, bracketAfter: false
    };
  };

  InlineParser.prototype.parseCloseBracket = function () {
    this.pos++;
    var startPos = this.pos;
    var opener = this.brackets;
    if (!opener) { this.addText(']'); return true; }
    if (!opener.active) { this.brackets = opener.prev; this.addText(']'); return true; }

    var src = this.src, dest = null, title = null, matched = false;

    /* Inline link: ( dest "title" ) */
    if (src[this.pos] === '(') {
      var save = this.pos;
      this.pos++;
      this.skipSpaces();
      var d = this.parseLinkDestination();
      if (d !== null) {
        var hadSpace = this.skipSpaces();
        if (hadSpace) title = this.parseLinkTitle();
        this.skipSpaces();
        if (src[this.pos] === ')') { this.pos++; dest = d; matched = true; }
      }
      if (!matched) { this.pos = save; title = null; }
    }

    /* Reference link */
    if (!matched) {
      var labelStart = this.pos, label = null;
      var lm = /^\[((?:\\.|[^\\\[\]])*)\]/.exec(src.slice(this.pos));
      if (lm) { label = lm[1]; this.pos += lm[0].length; }
      if (label === null || normalizeLabel(label) === '') {
        /* shortcut / collapsed: use the bracket text itself */
        if (!opener.bracketAfter) label = this.textBetween(opener.node);
      }
      var norm = normalizeLabel(label || '');
      var ref = norm ? this.ctx.refs[norm] : null;
      if (ref) { dest = ref.dest; title = ref.title; matched = true; }
      else if (!lm) this.pos = labelStart;
    }

    if (!matched) {
      this.brackets = opener.prev;
      this.pos = startPos;
      this.addText(']');
      return true;
    }

    var node = new Node(opener.image ? 'image' : 'link', '');
    node.href = dest;
    node.title = title;

    /* move everything after the opener into the new node */
    var kidsHead = opener.node.next;
    if (kidsHead) kidsHead.prev = null;
    opener.node.next = null;
    this.tail = opener.node;
    node.kids = kidsHead;

    this.processEmphasisIn(node, opener.prevDelim);

    /* replace the opener text node with the link node */
    var before = opener.node.prev;
    before.next = node; node.prev = before; node.next = null;
    this.tail = node;

    this.brackets = opener.prev;
    if (!opener.image) {
      var b = this.brackets;
      while (b) { if (!b.image) b.active = false; b = b.prev; }
    }
    return true;
  };

  InlineParser.prototype.textBetween = function (openerNode) {
    var s = '', n = openerNode.next;
    while (n) {
      if (n.t === 'text') s += n.v;
      else if (n.t === 'code') s += n.v;
      else if (n.t === 'softbreak') s += ' ';
      else return null;
      n = n.next;
    }
    return s;
  };

  InlineParser.prototype.skipSpaces = function () {
    var n = 0;
    while (this.pos < this.src.length && /[ \t\n]/.test(this.src[this.pos])) { this.pos++; n++; }
    return n > 0;
  };

  InlineParser.prototype.parseLinkDestination = function () {
    var src = this.src;
    if (src[this.pos] === '<') {
      var m = /^<((?:\\.|[^<>\n\\])*)>/.exec(src.slice(this.pos));
      if (!m) return null;
      this.pos += m[0].length;
      return unescapeString(m[1]);
    }
    var start = this.pos, depth = 0;
    while (this.pos < src.length) {
      var c = src[this.pos];
      if (c === '\\' && ESCAPABLE.test(src[this.pos + 1] || '')) { this.pos += 2; continue; }
      if (c === '(') { depth++; this.pos++; continue; }
      if (c === ')') { if (depth === 0) break; depth--; this.pos++; continue; }
      if (/[\s\u0000-\u001f]/.test(c)) break;
      this.pos++;
    }
    if (this.pos === start) return '';
    return unescapeString(src.slice(start, this.pos));
  };

  InlineParser.prototype.parseLinkTitle = function () {
    var m = /^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^()\\])*\))/.exec(this.src.slice(this.pos));
    if (!m) return null;
    this.pos += m[0].length;
    return unescapeString(m[1].slice(1, -1));
  };

  var RE_AUTOLINK = /^<([a-zA-Z][a-zA-Z0-9+.\-]{1,31}:[^<>\x00-\x20]*)>/;
  var RE_EMAIL = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;
  InlineParser.prototype.parseAutolinkOrHtml = function () {
    var rest = this.src.slice(this.pos), m;
    if ((m = RE_EMAIL.exec(rest))) {
      this.add(nodeLink('mailto:' + m[1], null, textNode(m[1])));
      this.pos += m[0].length; return true;
    }
    if ((m = RE_AUTOLINK.exec(rest))) {
      this.add(nodeLink(m[1], null, textNode(m[1])));
      this.pos += m[0].length; return true;
    }
    if ((m = /^<!--[\s\S]*?-->/.exec(rest)) || (m = /^<\?[\s\S]*?\?>/.exec(rest)) ||
      (m = /^<![A-Za-z][\s\S]*?>/.exec(rest)) || (m = /^<!\[CDATA\[[\s\S]*?\]\]>/.exec(rest)) ||
      (m = /^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>/.exec(rest))) {
      this.add(new Node('rawhtml', m[0]));
      this.pos += m[0].length; return true;
    }
    return false;
  };

  InlineParser.prototype.parseEntity = function () {
    var m = RE_ENTITY.exec(this.src.slice(this.pos));
    if (!m) return false;
    this.addText(decodeEntity(m[0]));
    this.pos += m[0].length;
    return true;
  };

  var RE_TAG_INLINE = /^#([\p{L}\p{N}][\p{L}\p{N}_\-\/]*)/u;
  /* a tag needs at least one non-digit, so "#5 bolt" stays plain text */
  var RE_TAG_OK = /[\p{L}_\-\/]/u;

  InlineParser.prototype.parseHashtag = function () {
    var before = this.pos > 0 ? this.src[this.pos - 1] : '\n';
    if (!(isSpace(before) || before === '(' || before === '[' || before === '>' || before === ',' || before === ';')) return false;
    var m = RE_TAG_INLINE.exec(this.src.slice(this.pos));
    if (!m) return false;
    var name = m[1].replace(/\/+$/, '');
    if (!name || !RE_TAG_OK.test(name)) return false;
    this.add(new Node('hashtag', name));
    this.pos += 1 + name.length;
    return true;
  };

  var EMOJI = {
    smile: '\u{1F642}', grin: '\u{1F600}', joy: '\u{1F602}', wink: '\u{1F609}',
    thinking: '\u{1F914}', tada: '\u{1F389}', rocket: '\u{1F680}', fire: '\u{1F525}',
    warning: '\u26A0\uFE0F', bulb: '\u{1F4A1}', book: '\u{1F4D6}', memo: '\u{1F4DD}',
    star: '\u2B50', heart: '\u2764\uFE0F', check: '\u2705', x: '\u274C',
    eyes: '\u{1F440}', bug: '\u{1F41B}', pin: '\u{1F4CC}', calendar: '\u{1F4C5}'
  };

  InlineParser.prototype.parseEmoji = function () {
    var m = /^:([a-z0-9_+\-]+):/.exec(this.src.slice(this.pos));
    if (!m || !EMOJI[m[1]]) return false;
    this.addText(EMOJI[m[1]]);
    this.pos += m[0].length;
    return true;
  };

  var RE_BARE = /^(?:https?:\/\/|www\.|ftp:\/\/)[^\s<]{2,}/;

  InlineParser.prototype.parseBareLink = function () {
    var before = this.pos > 0 ? this.src[this.pos - 1] : '\n';
    if (!(isSpace(before) || before === '(' || before === '*' || before === '_')) return false;
    var m = RE_BARE.exec(this.src.slice(this.pos));
    if (!m) return false;
    var url = m[0];
    /* trailing punctuation is not part of the link */
    var trail = /[!"'),.:;?\]}]+$/.exec(url);
    if (trail) url = url.slice(0, url.length - trail[0].length);
    var open = (url.match(/\(/g) || []).length, close = (url.match(/\)/g) || []).length;
    while (close > open && url[url.length - 1] === ')') { url = url.slice(0, -1); close--; }
    if (url.length < 5) return false;
    this.add(nodeLink(/^www\./.test(url) ? 'http://' + url : url, null, textNode(url)));
    this.pos += url.length;
    return true;
  };

  function textNode(s) { return new Node('text', s); }
  function nodeLink(href, title, kidsHead) {
    var n = new Node('link', '');
    n.href = href; n.title = title; n.kids = kidsHead;
    return n;
  }

  /* --- emphasis ------------------------------------------------- */

  InlineParser.prototype.removeDelim = function (d) {
    if (d.prev) d.prev.next = d.next;
    if (d.next) d.next.prev = d.prev;
    if (this.delims === d) this.delims = d.prev;
  };

  /* Run the emphasis pass over the detached child list of `node`. */
  InlineParser.prototype.processEmphasisIn = function (node, bottom) {
    var savedTail = this.tail;
    this.processEmphasis(bottom);
    this.tail = savedTail;
  };

  InlineParser.prototype.processEmphasis = function (bottom) {
    var openersBottom = {};
    var closer, opener, tmp;

    /* find the bottom-most delimiter above `bottom` */
    closer = this.delims;
    while (closer !== null && closer.prev !== bottom) closer = closer.prev;

    while (closer !== null) {
      if (!closer.canClose) { closer = closer.next; continue; }
      var key = closer.cc + ':' + (closer.orig % 3) + ':' + (closer.canOpen ? 1 : 0);
      var limit = openersBottom[key] !== undefined ? openersBottom[key] : bottom;
      opener = closer.prev;
      var found = false;
      while (opener !== null && opener !== bottom && opener !== limit) {
        if (opener.canOpen && opener.cc === closer.cc) {
          var oddMatch = (closer.canOpen || opener.canClose) &&
            closer.orig % 3 !== 0 && (opener.orig + closer.orig) % 3 === 0;
          if (!oddMatch) { found = true; break; }
        }
        opener = opener.prev;
      }

      if (!found) {
        openersBottom[key] = closer.prev;
        var next = closer.next;
        if (!closer.canOpen) this.removeDelim(closer);
        closer = next;
        continue;
      }

      var use;
      if (closer.cc === '~') use = Math.min(opener.num, closer.num, 2);
      else use = (opener.num >= 2 && closer.num >= 2) ? 2 : 1;

      var tag = closer.cc === '~' ? 'del' : (use === 2 ? 'strong' : 'em');

      opener.node.v = opener.node.v.slice(0, opener.node.v.length - use);
      closer.node.v = closer.node.v.slice(use);

      var wrap = new Node(tag, '');
      var kidsHead = opener.node.next;
      var kidsTail = closer.node.prev;
      if (kidsHead === closer.node) { kidsHead = null; }
      else {
        opener.node.next = null;
        if (kidsHead) kidsHead.prev = null;
        if (kidsTail) kidsTail.next = null;
      }
      wrap.kids = kidsHead;

      /* splice wrap between opener.node and closer.node */
      opener.node.next = wrap; wrap.prev = opener.node;
      wrap.next = closer.node; closer.node.prev = wrap;

      /* remove delimiters between opener and closer */
      tmp = opener.next;
      while (tmp && tmp !== closer) { var nx = tmp.next; this.removeDelim(tmp); tmp = nx; }

      opener.num -= use;
      closer.num -= use;

      if (opener.num === 0) { unlinkNode(opener.node, this); this.removeDelim(opener); }
      if (closer.num === 0) {
        var after = closer.next;
        unlinkNode(closer.node, this);
        this.removeDelim(closer);
        closer = after;
      }
    }

    /* drop remaining delimiters above bottom */
    while (this.delims !== null && this.delims !== bottom) this.removeDelim(this.delims);
  };

  function unlinkNode(n, parser) {
    if (n.prev) n.prev.next = n.next;
    if (n.next) n.next.prev = n.prev;
    if (parser && parser.tail === n) parser.tail = n.prev || parser.head;
    n.prev = n.next = null;
  }

  /* --- inline serialization -------------------------------------- */

  function serialize(node, ctx) {
    var out = '';
    while (node) {
      switch (node.t) {
        case 'text': out += escHtml(node.v); break;
        case 'code': out += '<code>' + escHtml(node.v) + '</code>'; break;
        case 'rawhtml': out += node.v; break;
        case 'softbreak': out += '\n'; break;
        case 'hardbreak': out += '<br />\n'; break;
        case 'em': out += '<em>' + serialize(node.kids, ctx) + '</em>'; break;
        case 'strong': out += '<strong>' + serialize(node.kids, ctx) + '</strong>'; break;
        case 'del': out += '<del>' + serialize(node.kids, ctx) + '</del>'; break;
        case 'hashtag':
          var lower = node.v.toLowerCase();
          ctx.tags.push(lower);
          out += '<a class="tagchip" data-tag="' + escAttr(lower) + '" href="#/tag/' +
            encodeURIComponent(lower) + '">#' + escHtml(node.v) + '</a>';
          break;
        case 'fnref':
          var fid = node.v, idx = ctx.footnoteOrder.indexOf(fid);
          if (idx === -1) { ctx.footnoteOrder.push(fid); idx = ctx.footnoteOrder.length - 1; }
          out += '<sup class="fnref" id="fnref-' + escAttr(fid) + '"><a href="#fn-' +
            escAttr(fid) + '">' + (idx + 1) + '</a></sup>';
          break;
        case 'link': {
          var href = safeURL(node.href);
          var ext = /^[a-z][a-z0-9+.\-]*:/i.test(href) && !/^mailto:/i.test(href);
          out += '<a href="' + escAttr(href) + '"' +
            (node.title ? ' title="' + escAttr(node.title) + '"' : '') +
            (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
            serialize(node.kids, ctx) + '</a>';
          break;
        }
        case 'image': {
          var src = safeURL(node.href);
          var alt = plainText(node.kids);
          out += '<img src="' + escAttr(src) + '" alt="' + escAttr(alt) + '"' +
            (node.title ? ' title="' + escAttr(node.title) + '"' : '') + ' loading="lazy" />';
          break;
        }
        default: break;
      }
      node = node.next;
    }
    return out;
  }

  function plainText(node) {
    var out = '';
    while (node) {
      if (node.t === 'text' || node.t === 'code') out += node.v;
      else if (node.t === 'hashtag') out += '#' + node.v;
      else if (node.t === 'softbreak' || node.t === 'hardbreak') out += ' ';
      else if (node.kids) out += plainText(node.kids);
      node = node.next;
    }
    return out;
  }

  /* ================================================================
   * Block rendering
   * ================================================================ */

  function renderBlocks(blocks, ctx, tight) {
    var out = '';
    for (var i = 0; i < blocks.length; i++) out += renderBlock(blocks[i], ctx, tight);
    return out;
  }

  function inline(text, ctx) {
    return new InlineParser(ctx).parse(text);
  }

  function renderBlock(b, ctx, tight) {
    switch (b.t) {
      case 'hr': return '<hr />\n';
      case 'heading': {
        var html = inline(b.text, ctx);
        var id = slugify(plainTextFromHtml(html));
        return '<h' + b.level + ' id="' + escAttr(id) + '">' + html + '</h' + b.level + '>\n';
      }
      case 'para':
        if (tight) return inline(b.text, ctx);
        return '<p>' + inline(b.text, ctx) + '</p>\n';
      case 'code': {
        var lang = b.info ? b.info.split(/\s+/)[0] : '';
        return '<pre><code' + (lang ? ' class="language-' + escAttr(lang) + '"' : '') + '>' +
          escHtml(b.text) + '\n</code></pre>\n';
      }
      case 'html': return b.text + '\n';
      case 'quote': return '<blockquote>\n' + renderBlocks(b.blocks, ctx, false) + '</blockquote>\n';
      case 'list': {
        var tag = b.ordered ? 'ol' : 'ul';
        var attrs = b.ordered && b.start !== 1 ? ' start="' + b.start + '"' : '';
        var hasTask = b.items.some(function (it) { return it.task !== null; });
        var out = '<' + tag + attrs + (hasTask ? ' class="task-list"' : '') + '>\n';
        for (var i = 0; i < b.items.length; i++) {
          var it = b.items[i];
          out += '<li' + (it.task !== null ? ' class="task-item"' : '') + '>';
          if (it.task !== null) {
            out += '<input type="checkbox" disabled' + (it.task ? ' checked' : '') + ' /> ';
          }
          var inner = renderBlocks(it.blocks, ctx, b.tight);
          out += b.tight ? inner.replace(/\n$/, '') : '\n' + inner;
          out += '</li>\n';
        }
        return out + '</' + tag + '>\n';
      }
      case 'table': {
        var out2 = '<div class="table-wrap"><table>\n<thead>\n<tr>';
        for (var h = 0; h < b.head.length; h++) {
          out2 += '<th' + (b.align[h] ? ' style="text-align:' + b.align[h] + '"' : '') + '>' +
            inline(b.head[h], ctx) + '</th>';
        }
        out2 += '</tr>\n</thead>\n';
        if (b.rows.length) {
          out2 += '<tbody>\n';
          for (var r = 0; r < b.rows.length; r++) {
            out2 += '<tr>';
            for (var c = 0; c < b.rows[r].length; c++) {
              out2 += '<td' + (b.align[c] ? ' style="text-align:' + b.align[c] + '"' : '') + '>' +
                inline(b.rows[r][c], ctx) + '</td>';
            }
            out2 += '</tr>\n';
          }
          out2 += '</tbody>\n';
        }
        return out2 + '</table></div>\n';
      }
      default: return '';
    }
  }

  function plainTextFromHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /* ================================================================
   * Public API
   * ================================================================ */

  function prepare(src) {
    return String(src == null ? '' : src)
      .replace(/\u0000/g, '\ufffd')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, '    ');
  }

  function render(src) {
    var fm = stripFrontMatter(prepare(src));
    var ctx = { refs: Object.create(null), footnotes: [], usedFootnotes: [], footnoteOrder: [], tags: [] };
    var blocks = parseBlocks(fm.body.split('\n'), ctx);
    var html = renderBlocks(blocks, ctx, false);

    if (ctx.footnoteOrder.length) {
      var items = '';
      for (var i = 0; i < ctx.footnoteOrder.length; i++) {
        var id = ctx.footnoteOrder[i];
        var def = null;
        for (var j = 0; j < ctx.footnotes.length; j++) if (ctx.footnotes[j].id === id) def = ctx.footnotes[j];
        var body = def ? renderBlocks(def.blocks, ctx, false) : '<p><em>missing footnote</em></p>\n';
        items += '<li id="fn-' + escAttr(id) + '">' + body +
          '<a class="fnback" href="#fnref-' + escAttr(id) + '">\u21a9</a></li>\n';
      }
      html += '<section class="footnotes"><hr /><ol>\n' + items + '</ol></section>\n';
    }
    return html;
  }

  /* Tags found in a note: body hashtags only (code spans/blocks excluded). */
  function extractTags(src) {
    var fm = stripFrontMatter(prepare(src));
    var text = fm.body
      .replace(/^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1[ \t]*$/gm, '')  /* fenced code */
      .replace(/`[^`\n]*`/g, '')                                       /* code spans */
      .replace(/^ {4,}.*$/gm, '')                                      /* indented code */
      .replace(/<[^>]*>/g, ' ')                                        /* html tags */
      .replace(/\]\([^)\s]*\)/g, ']( )');                              /* link targets */
    var re = /(^|[\s(\[>,;])#([\p{L}\p{N}][\p{L}\p{N}_\-\/]*)/gu;
    var out = [], seen = Object.create(null), m;
    while ((m = re.exec(text))) {
      var t = m[2].replace(/\/+$/, '').toLowerCase();
      if (!t || seen[t] || !RE_TAG_OK.test(t)) continue;
      seen[t] = true;
      out.push(t);
    }
    return out;
  }

  function firstHeading(src) {
    var fm = stripFrontMatter(prepare(src));
    var lines = fm.body.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = RE_ATX.exec(lines[i]);
      if (m && m[1].length === 1) return (m[2] || '').replace(/(^|[ \t])#+[ \t]*$/, '').trim();
      if (i > 0 && RE_SETEXT.test(lines[i]) && lines[i].trim()[0] === '=' && lines[i - 1].trim()) {
        return lines[i - 1].trim();
      }
    }
    for (var k = 0; k < lines.length; k++) {
      var m2 = RE_ATX.exec(lines[k]);
      if (m2) return (m2[2] || '').replace(/(^|[ \t])#+[ \t]*$/, '').trim();
    }
    return null;
  }

  /* Plain text of a note, for full-text search. */
  function toPlainText(src) {
    var fm = stripFrontMatter(prepare(src));
    return fm.body
      .replace(/^ {0,3}(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^ {0,3}\1[ \t]*$/gm, '$3')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_~>#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  global.MD = {
    render: render,
    extractTags: extractTags,
    firstHeading: firstHeading,
    stripFrontMatter: stripFrontMatter,
    toPlainText: toPlainText,
    escapeHtml: escHtml,
    slugify: slugify
  };
})(typeof window !== 'undefined' ? window : globalThis);
