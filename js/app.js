/* JoeNote - js/app.js
 * Wires everything together: routing, the map, search results, and the
 * note view/edit surface.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var App = {
    notes: [],
    byName: Object.create(null),
    current: null,       /* the note object being viewed */
    mode: 'view',
    dirty: false,
    saveTimer: null,
    graph: null,
    booted: false
  };

  /* =============================== utils =============================== */

  var toastTimer = null;
  function toast(msg, isError) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, isError ? 5000 : 2200);
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function slug(s) {
    return String(s || '').toLowerCase()
      .replace(/[#`*_~\[\]()]/g, '')
      .replace(/[^\wÀ-ɏ\- ]+/g, '')
      .trim().replace(/\s+/g, '-').replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'note';
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }

  /* ================================ dates ==============================
   * A note carries its own dates in its front matter, so they survive a
   * move between the three backends, a download and a re-import:
   *
   *     ---
   *     created: 2026-08-02T04:23:05Z
   *     updated: 2026-08-02T05:01:44Z
   *     ---
   *
   * Stored in UTC, shown in local time. Notes written before this existed
   * have no stamp; they fall back to whatever the backend knows (the file's
   * modified time on a folder, the recorded time in this browser) and are
   * marked approximate until their next save.
   * ------------------------------------------------------------------ */

  var CREATED_KEYS = ['created', 'created_at', 'createdat', 'date'];
  var UPDATED_KEYS = ['updated', 'updated_at', 'updatedat', 'modified', 'last_modified', 'lastmod'];

  function iso(t) { return new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

  function parseStamp(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    /* a bare date means that day here, not that day in UTC */
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    var t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  }

  function metaTime(meta, keys) {
    for (var i = 0; i < keys.length; i++) {
      var t = parseStamp(meta[keys[i]]);
      if (t) return t;
    }
    return 0;
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(t) {
    if (!t) return '—';
    var d = new Date(t);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtDateTime(t) {
    if (!t) return '—';
    var d = new Date(t);
    return fmtDate(t) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function relTime(t) {
    if (!t) return '';
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 0) return '';
    if (s < 60) return 'just now';
    if (s < 3600) { var m = Math.round(s / 60); return m + ' minute' + (m === 1 ? '' : 's') + ' ago'; }
    if (s < 86400) { var h = Math.round(s / 3600); return h + ' hour' + (h === 1 ? '' : 's') + ' ago'; }
    if (s < 86400 * 30) { var d = Math.round(s / 86400); return d + ' day' + (d === 1 ? '' : 's') + ' ago'; }
    return '';
  }

  function uniqueName(base) {
    var name = base + '.md', i = 2;
    while (App.byName[name]) { name = base + '-' + i + '.md'; i++; }
    return name;
  }

  /* =============================== index =============================== */

  function indexNote(name, raw, mtime) {
    var fm = MD.stripFrontMatter(raw);
    var title = (MD.firstHeading(raw) || fm.meta.title || name.replace(/\.md$/i, '')).trim();
    var tags = MD.extractTags(raw);

    var created = metaTime(fm.meta, CREATED_KEYS);
    var updated = metaTime(fm.meta, UPDATED_KEYS);
    var stamped = !!(created || updated);
    if (!updated) updated = mtime || created || 0;
    if (!created) created = mtime || updated || 0;

    return {
      name: name,
      raw: raw,
      mtime: mtime || 0,
      created: created,
      updated: updated,
      stamped: stamped,      /* false = guessed from the file, not recorded */
      title: title || name,
      tags: tags,
      expanded: Object.create(null),
      plain: MD.toPlainText(raw),
      hasImage: /!\[[^\]]*\]\(/.test(fm.body) || /<img[\s>]/i.test(fm.body),
      meta: fm.meta
    };
  }

  function reindex() {
    App.byName = Object.create(null);
    App.notes.forEach(function (n) { App.byName[n.name] = n; });
    Tags.syncCounts(App.notes);
    App.notes.forEach(function (n) { n.expanded = Tags.expand(n.tags); });
    refreshTagList();
  }

  function loadAll() {
    return Promise.all([Store.listNotes(), Store.readTagsXML()]).then(function (res) {
      var files = res[0], xml = res[1];
      Tags.parse(xml || Tags.DEFAULT_XML);
      App.notes = files.map(function (f) { return indexNote(f.name, f.text, f.mtime); })
        .sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
      reindex();
      updateStoragePill();
      renderMap();
    });
  }

  function saveTags() {
    return Store.writeTagsXML(Tags.serialize());
  }

  function refreshTagList() {
    var dl = $('tag-list');
    dl.innerHTML = '';
    Tags.all().forEach(function (rec) {
      var o = document.createElement('option');
      o.value = rec.name;
      dl.appendChild(o);
    });
  }

  /* ============================== storage ============================== */

  function updateStoragePill() {
    var d = Store.describe();
    var pill = $('storage-pill');
    pill.textContent = d.label;
    pill.title = d.detail + '  (click to change)';
    pill.className = 'pill destination ' + d.kind;

    $('btn-github').textContent = Store.mode === 'github' ? 'GitHub ✓' : 'GitHub…';
    $('btn-connect').textContent = Store.mode === 'fs' ? 'Folder ✓' : 'Folder…';

    var banner = $('storage-banner');
    banner.hidden = d.safe;
    if (!d.safe) $('storage-banner-text').textContent = d.detail;
  }

  function connectFolder() {
    Store.connect().then(function () {
      return loadAll();
    }).then(function () {
      toast('Notes now live in ' + Store.folderName + '/notes on this computer');
      route();
    }).catch(function (e) {
      if (e && e.name === 'AbortError') return;
      toast(e.message || String(e), true);
    });
  }

  /* ------------------------------ github ------------------------------ */

  function openGitHubSheet() {
    var g = Store.github || Store.guessRepo();
    $('gh-owner').value = g.owner || '';
    $('gh-repo').value = g.repo || '';
    $('gh-branch').value = g.branch || 'main';
    $('gh-token').value = Store.github ? Store.github.token : '';
    $('gh-msg').textContent = '';
    $('gh-msg').classList.remove('ok');
    $('gh-disconnect').hidden = Store.mode !== 'github';
    $('gh-save').textContent = Store.mode === 'github' ? 'Save' : 'Connect';
    $('gh-overlay').hidden = false;
    setTimeout(function () { ($('gh-token').value ? $('gh-save') : $('gh-token')).focus(); }, 30);
  }

  function closeGitHubSheet() { $('gh-overlay').hidden = true; }

  function submitGitHub() {
    var msg = $('gh-msg');
    msg.classList.remove('ok');
    msg.textContent = 'Checking the token against GitHub…';
    $('gh-save').disabled = true;

    Store.connectGitHub({
      owner: $('gh-owner').value,
      repo: $('gh-repo').value,
      branch: $('gh-branch').value,
      token: $('gh-token').value
    }).then(function () {
      msg.textContent = 'Connected. Loading notes from the repo…';
      msg.classList.add('ok');
      return loadAll();
    }).then(function () {
      closeGitHubSheet();
      toast('Saves now commit to ' + Store.github.owner + '/' + Store.github.repo);
      route();
    }).catch(function (e) {
      msg.textContent = e.message || String(e);
      msg.classList.remove('ok');
    }).then(function () {
      $('gh-save').disabled = false;
    });
  }

  function disconnectGitHub() {
    if (!confirm('Disconnect GitHub?\n\nThe notes stay in the repository — this browser just stops writing to it, ' +
      'and the token is removed from local storage.')) return;
    Store.disconnectGitHub()
      .then(loadAll)
      .then(function () {
        closeGitHubSheet();
        toast('Disconnected from GitHub');
        route();
      });
  }

  /* =============================== router ============================== */

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  /* A note may carry a place in it as well as a name: the second # in
     #/note/big.md#ch05 is a link into the document, not part of the route. */
  function splitHash(hash) {
    var h = String(hash || '').replace(/^#/, '');
    var cut = h.indexOf('#');
    return { route: cut === -1 ? h : h.slice(0, cut), anchor: cut === -1 ? '' : h.slice(cut + 1) };
  }

  function route() {
    var split = splitHash(location.hash);
    var h = split.route || '/';
    var parts = h.split('/').filter(function (s) { return s !== ''; });

    if (parts[0] === 'note' && parts[1]) {
      pendingAnchor = split.anchor;
      try { pendingAnchor = decodeURIComponent(pendingAnchor); } catch (e) { /* as written */ }
      showNote(decodeURIComponent(parts[1]), parts[2] === 'edit' ? 'edit' : 'view');
      return;
    }
    if (parts[0] === 'tag' && parts[1]) {
      showResults('#' + decodeURIComponent(parts[1]));
      return;
    }
    if (parts[0] === 'q' && parts[1] !== undefined) {
      showResults(decodeURIComponent(parts.slice(1).join('/')));
      return;
    }
    showHome();
  }

  function setView(id) {
    ['view-home', 'view-results', 'view-note'].forEach(function (v) { $(v).hidden = v !== id; });
  }

  /* ================================ home =============================== */

  function showHome() {
    flushSave();
    setView('view-home');
    syncDateFilter();
    renderMap();
    setTimeout(function () { if (App.graph) App.graph.fit(); }, 30);
  }

  function renderMap() {
    if (!App.graph) {
      App.graph = new Graph($('map'), {
        onSelect: function (name) { openTagPanel(name); },
        onOpen: function (name) { go('#/tag/' + encodeURIComponent(name)); },
        onBlank: function () { closeTagPanel(); }
      });
    }
    var visible = visibleTags();
    App.graph.setData(visible);
    $('map-empty').hidden = Object.keys(visible).length > 0;
    applyLiveHighlight();
  }

  /* A hashtag earns a place on the map by leading to at least one note -
     either directly, or through a hashtag below it. Anything that leads
     nowhere stays in tags.xml but is not drawn. */
  function visibleTags() {
    var out = Object.create(null);
    Object.keys(Tags.map).forEach(function (name) {
      if (Tags.map[name].count > 0) { out[name] = Tags.map[name]; return; }
      var below = Tags.descendants(name);
      for (var k in below) {
        if (Tags.map[k] && Tags.map[k].count > 0) { out[name] = Tags.map[name]; return; }
      }
    });
    return out;
  }

  function applyLiveHighlight() {
    if (!App.graph) return;
    var q = $('q').value.trim();
    if (!q) { App.graph.setHighlight(null); return; }
    var compiled = Search.compile(q);
    if (!compiled.ok || compiled.empty) { App.graph.setHighlight(null); return; }
    var hit = Object.create(null);
    App.notes.forEach(function (n) {
      if (compiled.test(n)) n.tags.forEach(function (t) { hit[t] = true; });
    });
    /* also light up tags whose own name matches the query text */
    Tags.all().forEach(function (rec) {
      compiled.terms.forEach(function (term) {
        if (Search.globToRe(term.toLowerCase().replace(/^#/, ''), true).test(rec.name)) hit[rec.name] = true;
      });
    });
    App.graph.setHighlight(Object.keys(hit));
  }

  /* ============================ date filter ============================
   * The pickers do not filter anything themselves. They write a term into
   * the search box and read it back out, so the query string stays the one
   * source of truth: the live count, the map highlight, the results view
   * and the #/q/... URL all keep working without knowing they exist.
   * ------------------------------------------------------------------ */

  var DATE_FIELD_NAMES = Object.keys(Search.dateFields).join('|');
  var RE_DATE_TERM = new RegExp('(^|\\s)-?(?:' + DATE_FIELD_NAMES + ')\\s*:\\s*\\S+', 'gi');
  var RE_ONE_DATE_TERM = new RegExp('(?:^|\\s)(' + DATE_FIELD_NAMES + ')\\s*:\\s*(\\S+)', 'i');

  /* The pickers can only speak ISO — that is the value an <input type="date">
     holds, whatever it draws on screen. The query box speaks the way dates are
     written here, day first, so the two are translated at the boundary. Both
     spellings are read back, since a query typed by hand or arriving in a
     #/q/... link may be in either. */
  var RE_ONE_DAY = /^(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}-\d{2}-\d{2})$/;

  function auDate(isoDay) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay || '');
    return m ? m[3] + '-' + m[2] + '-' + m[1] : (isoDay || '');
  }
  function isoDate(s) {
    var m = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(s || '');
    if (m) return +m[2] > 12 ? '' : m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]);
    m = /^\d{4}-\d{2}-\d{2}$/.exec(s || '');
    return m ? m[0] : '';
  }

  /* The two halves of a value the pickers could hold exactly, or null. */
  function plainDays(v) {
    var half = String(v).split('..');
    if (half.length > 2) return null;
    for (var i = 0; i < half.length; i++) {
      if (half[i] && !RE_ONE_DAY.test(half[i])) return null;
    }
    return half;
  }

  function stripDateTerms(q) {
    return String(q || '').replace(RE_DATE_TERM, '$1').replace(/\s{2,}/g, ' ').trim();
  }

  /* pickers -> query box */
  function applyDateFilter() {
    var field = $('df-field').value;
    var from = $('df-from').value, to = $('df-to').value;
    if (from && to && from > to) { var swap = from; from = to; to = swap; }
    var term = '';
    if (from && from === to) term = field + ':' + auDate(from);
    else if (from || to) term = field + ':' + auDate(from) + '..' + auDate(to);

    var base = stripDateTerms($('q').value);
    $('q').value = base && term ? base + ' ' + term : (base || term);
    $('q').dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setPreset(range) {
    var field = $('df-field').value;
    var base = stripDateTerms($('q').value);
    $('q').value = base ? base + ' ' + field + ':' + range : field + ':' + range;
    $('q').dispatchEvent(new Event('input', { bubbles: true }));
  }

  function clearDateFilter() {
    $('df-from').value = '';
    $('df-to').value = '';
    $('q').value = stripDateTerms($('q').value);
    $('q').dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* query box -> pickers. Only a term the two inputs can hold exactly is
     read back into them; anything richer (7d, >=08-2026, before:) stays in
     the box untouched and merely lights the button, so that opening the
     panel can never quietly reinterpret what was typed. */
  function syncDateFilter() {
    var m = RE_ONE_DATE_TERM.exec($('q').value);
    var btn = $('btn-dates');
    var from = '', to = '';

    if (m) {
      var field = m[1].toLowerCase(), v = m[2];
      $('df-field').value = aliasField(field);
      var half = plainDays(v);
      if (half) {
        if (field === 'since') from = isoDate(v);
        else if (field === 'until') to = isoDate(v);
        else if (field === 'before' || field === 'after') { /* not a plain span */ }
        else if (half.length === 1) { from = to = isoDate(v); }
        else { from = isoDate(half[0]); to = isoDate(half[1]); }
      }
    }
    $('df-from').value = from;
    $('df-to').value = to;

    btn.setAttribute('aria-pressed', String(!!m));
    btn.textContent = m ? 'Dates ✓' : 'Dates';
    btn.title = m ? 'Filtering on ' + m[0].trim() + ' — click to change'
      : 'Limit the search to a date or a date range';
  }

  /* the <select> only offers the three the pickers can write */
  function aliasField(f) {
    if (f === 'created') return 'created';
    if (f === 'updated' || f === 'modified') return 'updated';
    return 'date';
  }

  /* ============================== results ============================== */

  function showResults(query) {
    flushSave();
    setView('view-results');
    $('q').value = query;
    syncDateFilter();
    $('results-query').textContent = query;

    var compiled = Search.compile(query);
    var list = $('results');
    list.innerHTML = '';

    if (!compiled.ok) {
      $('results-count').textContent = 'error';
      $('results-empty').hidden = false;
      $('results-empty').textContent = compiled.error;
      return;
    }

    var hits = App.notes.filter(compiled.test);
    $('results-count').textContent = hits.length + (hits.length === 1 ? ' note' : ' notes');
    $('results-empty').hidden = hits.length > 0;
    $('results-empty').textContent = 'Nothing matched.';

    var terms = compiled.terms.filter(function (t) { return t && t.replace(/[*?]/g, '').length > 1; });

    hits.forEach(function (n) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'result';
      a.href = '#/note/' + encodeURIComponent(n.name);

      var h = document.createElement('h3');
      h.innerHTML = highlight(n.title, terms);
      a.appendChild(h);

      var p = document.createElement('p');
      p.className = 'snippet';
      p.innerHTML = highlight(snippet(n, terms), terms);
      a.appendChild(p);

      var meta = document.createElement('div');
      meta.className = 'meta';
      n.tags.forEach(function (t) {
        var c = document.createElement('span');
        c.className = 'chip';
        c.textContent = '#' + t;
        meta.appendChild(c);
      });
      var when = document.createElement('span');
      when.className = 'when' + (n.stamped ? '' : ' approx');
      when.textContent = fmtDate(n.updated);
      when.title = datesTooltip(n);
      meta.appendChild(when);

      var f = document.createElement('span');
      f.className = 'file';
      f.textContent = n.name;
      meta.appendChild(f);
      a.appendChild(meta);

      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function snippet(note, terms) {
    var text = note.plain;
    if (!terms.length) return text.slice(0, 220);
    for (var i = 0; i < terms.length; i++) {
      var re = Search.globToRe(terms[i], false);
      var m = re.exec(text);
      if (m && m.index > -1) {
        var start = Math.max(0, m.index - 70);
        return (start ? '… ' : '') + text.slice(start, start + 220);
      }
    }
    return text.slice(0, 220);
  }

  function highlight(text, terms) {
    var out = MD.escapeHtml(text);
    terms.forEach(function (t) {
      var clean = t.replace(/^[#=]/, '');
      if (!clean) return;
      try {
        var re = new RegExp('(' + escapeRe(clean).replace(/\\\*/g, '[^\\s]*').replace(/\\\?/g, '.') + ')', 'gi');
        out = out.replace(re, '<mark>$1</mark>');
      } catch (e) { /* ignore odd patterns */ }
    });
    return out;
  }

  /* ================================ note =============================== */

  function showNote(name, mode) {
    var note = App.byName[name];
    if (!note) {
      setView('view-results');
      $('results').innerHTML = '';
      $('results-query').textContent = name;
      $('results-count').textContent = '';
      $('results-empty').hidden = false;
      $('results-empty').textContent = 'No note called "' + name + '".';
      return;
    }
    if (App.current && App.current.name !== name) flushSave();
    App.current = note;
    setView('view-note');
    $('note-file').textContent = note.name;
    setMode(mode);
    resyncCurrent(true);   /* show what the repo has, not what boot happened to read */
  }

  function setMode(mode) {
    App.mode = mode;
    var note = App.current;
    if (!note) return;

    $('btn-mode-view').setAttribute('aria-pressed', String(mode === 'view'));
    $('btn-mode-edit').setAttribute('aria-pressed', String(mode === 'edit'));
    $('note-view').hidden = mode !== 'view';
    $('note-edit').hidden = mode !== 'edit';
    $('editor-hint').hidden = mode !== 'edit';

    renderTagRow(note);
    renderDates(note);

    if (mode === 'edit') {
      var ta = $('note-edit');
      if (ta.value !== note.raw) ta.value = note.raw;
      setTimeout(function () { ta.focus(); }, 0);
    } else {
      renderMarkdown(note.raw);
    }

    /* a place inside this note survives a switch between reading and editing,
       so the URL still points at the paragraph it was pointing at */
    var here = splitHash(location.hash);
    var hereParts = here.route.split('/').filter(function (s) { return s !== ''; });
    var sameNote = hereParts[0] === 'note' && hereParts[1] &&
      decodeURIComponent(hereParts[1]) === note.name;
    var frag = sameNote && here.anchor ? '#' + here.anchor : '';

    var want = '#/note/' + encodeURIComponent(note.name) + (mode === 'edit' ? '/edit' : '') + frag;
    if (location.hash !== want) history.replaceState(null, '', want);
  }

  function datesTooltip(note) {
    return 'Created ' + fmtDateTime(note.created) +
      '\nLast modified ' + fmtDateTime(note.updated) +
      (note.stamped ? '' : '\n\nApproximate — this note has no recorded dates yet. ' +
        'Saving it once writes them into the file.');
  }

  function renderDates(note) {
    var el = $('note-dates');
    el.hidden = !note || !(note.created || note.updated);
    if (el.hidden) return;
    el.textContent = '';
    el.title = datesTooltip(note);

    var line = document.createElement('span');
    if (!note.stamped) line.className = 'approx';
    var rel = relTime(note.updated);
    line.textContent = 'Created ' + fmtDateTime(note.created) +
      '  ·  Last modified ' + fmtDateTime(note.updated) + (rel ? ' (' + rel + ')' : '') +
      (note.stamped ? '' : '  ·  approximate until the next save');
    el.appendChild(line);
  }

  function renderTagRow(note) {
    var row = $('note-tags');
    row.innerHTML = '';
    note.tags.forEach(function (t) {
      var a = document.createElement('a');
      a.className = 'chip';
      a.href = '#/tag/' + encodeURIComponent(t);
      a.textContent = '#' + t;
      row.appendChild(a);
    });
    if (!note.tags.length) {
      var s = document.createElement('span');
      s.className = 'file';
      s.style.color = 'var(--fg-faint)';
      s.style.fontSize = '12px';
      s.textContent = 'no hashtags yet — add one like #inbox so this note shows on the map';
      row.appendChild(s);
    }
  }

  function renderMarkdown(raw) {
    var target = $('note-view');
    target.innerHTML = '';
    var frag = Sanitize.toFragment(MD.render(raw));
    target.appendChild(frag);
    resolveImages(target);
    if (pendingAnchor) {
      var id = pendingAnchor;
      pendingAnchor = '';
      /* the note is in the document but has not been laid out yet */
      setTimeout(function () { jumpTo(id, false); }, 0);
    }
  }

  /* ------------------------- links within a note -----------------------
   * A long note carries its own table of contents: [Chapter 5](#ch05)
   * against an <a id="ch05"> further down. Left alone, the browser writes
   * #ch05 into the address bar, the router reads it as a route it has never
   * heard of, and the reader is thrown out to the map. So a link that points
   * inside the open note is followed here instead - the page scrolls, and
   * the address bar keeps the note it is in: #/note/big.md#ch05.
   * ------------------------------------------------------------------ */

  var pendingAnchor = '';

  function anchorTarget(id) {
    var view = $('note-view');
    if (!id || !view) return null;
    /* getElementById would find an id anywhere on the page - the panels and
       the toolbar have their own - so only the note itself is searched */
    var esc = window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
    try {
      return view.querySelector('#' + esc) || view.querySelector('[name="' + esc + '"]');
    } catch (e) { return null; }
  }

  /* An anchor is often an empty <a id="ch05"></a> in a paragraph of its own,
     which has nothing to scroll to. What it marks is the heading after it. */
  function scrollHost(el) {
    var view = $('note-view');
    if (el.getClientRects().length) return el;
    var host = el.parentElement;
    if (host && host !== view && host.textContent.trim()) return host;
    var from = host && host !== view ? host : el;
    var after = from.nextElementSibling;
    while (after && !after.getClientRects().length) after = after.nextElementSibling;
    return after || from;
  }

  function jumpTo(id, smooth) {
    var el = anchorTarget(id);
    if (!el) return false;
    var seen = scrollHost(el);
    /* Chrome quietly drops a smooth scroll that has to cross a very long
       document, and a book-length note is exactly that - so anything but a
       short hop goes straight there instead of not going at all */
    var near = smooth !== false && Math.abs(seen.getBoundingClientRect().top) < 2400;
    seen.scrollIntoView({ behavior: near ? 'smooth' : 'auto', block: 'start' });
    return true;
  }

  function wireNoteLinks() {
    $('note-view').addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || !$('note-view').contains(a)) return;
      var href = a.getAttribute('href') || '';
      /* #/... is a route of its own - a hashtag chip, another note - and is
         left to the router */
      if (href.charAt(0) !== '#' || href.charAt(1) === '/' || href.length < 2) return;
      var id = href.slice(1);
      try { id = decodeURIComponent(id); } catch (err) { /* leave it as written */ }
      e.preventDefault();
      if (!jumpTo(id)) { toast('Nothing in this note is marked "' + id + '"', true); return; }
      if (App.current) {
        history.pushState(null, '',
          '#/note/' + encodeURIComponent(App.current.name) + '#' + encodeURIComponent(id));
      }
    });
  }

  function resolveImages(root) {
    var imgs = root.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        var src = img.getAttribute('src') || '';
        if (!src || /^(https?:|data:|blob:)/i.test(src)) return;
        Store.resolveAsset(src).then(function (url) {
          if (url) img.src = url;
          else img.replaceWith(missingImage(src, img.alt));
        });
      })(imgs[i]);
    }
  }

  function missingImage(src, alt) {
    var span = document.createElement('span');
    span.className = 'file';
    span.style.color = 'var(--fg-faint)';
    span.textContent = '[missing image: ' + src + (alt ? ' — ' + alt : '') + ']';
    return span;
  }

  /* ----------------------------- staying in sync -----------------------
   * Every note is read once, at boot, and kept in App.notes from then on.
   * That is fine until the file changes somewhere else - edited on
   * github.com, saved from a phone, open in a second tab - at which point
   * this tab goes on showing the copy it read at load and, worse, saves
   * over the newer one. So re-read the open note whenever it is opened and
   * whenever the tab comes back to the front.
   * ------------------------------------------------------------------ */

  var RESYNC_MIN_GAP = 2500;   /* alt-tabbing should not hammer the API */
  var lastResync = 0;
  var resyncing = false;

  /* Replace a note's contents in place, so anything holding the object
     (App.current, the map, a results list) follows along. */
  function adoptRemote(note, raw) {
    var fresh = indexNote(note.name, raw, Date.now());
    ['raw', 'title', 'tags', 'plain', 'hasImage', 'meta',
      'created', 'updated', 'stamped', 'mtime'].forEach(function (k) { note[k] = fresh[k]; });
    reindex();
    if (App.current === note) {
      renderTagRow(note);
      renderDates(note);
      if (App.mode === 'edit') $('note-edit').value = note.raw;
      else renderMarkdown(note.raw);
    }
    if (!$('view-home').hidden) renderMap();
  }

  function resyncCurrent(force) {
    var note = App.current;
    if (!note || resyncing) return Promise.resolve(false);
    /* unsaved edits win: leave them alone and let the save detect the clash */
    if (App.dirty) return Promise.resolve(false);
    if (!force && Date.now() - lastResync < RESYNC_MIN_GAP) return Promise.resolve(false);

    resyncing = true;
    lastResync = Date.now();
    return Store.readNote(note.name).then(function (raw) {
      if (App.current !== note || App.dirty || raw === note.raw) return false;
      adoptRemote(note, raw);
      toast(note.name + ' changed elsewhere — showing the current version');
      return true;
    }).catch(function () {
      return false;          /* offline, deleted, no permission: keep what we have */
    }).then(function (changed) {
      resyncing = false;
      return changed;
    });
  }

  /* ------------------------------ saving ------------------------------ */

  function markDirty() {
    App.dirty = true;
    $('note-status').textContent = 'unsaved';
    $('note-status').classList.remove('saved');
    clearTimeout(App.saveTimer);
    App.saveTimer = setTimeout(saveCurrent, Store.autosaveDelay());
  }

  function flushSave() {
    if (App.dirty) { clearTimeout(App.saveTimer); saveCurrent(); }
  }

  function saveCurrent() {
    var note = App.current;
    if (!note) return Promise.resolve();
    var typed = $('note-edit').hidden ? note.raw : $('note-edit').value;
    var oldTitle = note.title;
    var oldTags = note.tags.slice();
    var now = Date.now();

    /* Stamp the file itself. The textarea is deliberately left alone: it is
       refreshed on the next mode switch, and rewriting it here would jump
       the caret mid-sentence, since autosave runs while you type. */
    var typedCreated = metaTime(MD.stripFrontMatter(typed).meta, CREATED_KEYS);
    var raw = MD.setFrontMatter(typed, {
      created: iso(typedCreated || note.created || now),
      updated: iso(now)
    });

    var fresh = indexNote(note.name, raw, now);
    var wantName = note.name;

    /* the file name follows the title (announced by a toast, never silent) */
    if (fresh.title !== oldTitle) {
      var candidate = slug(fresh.title) + '.md';
      if (candidate !== note.name && !App.byName[candidate]) wantName = candidate;
    }

    App.dirty = false;
    $('note-status').textContent = Store.mode === 'github' ? 'committing…' : 'saving…';
    return Store.writeNote(note.name, raw)
      .then(function () {
        if (wantName !== note.name) {
          var oldName = note.name;
          /* hand over the bytes just committed: the copy must never depend on
             reading them back, or the retitle that caused the rename is lost */
          return Store.renameNote(oldName, wantName, raw).then(function () {
            delete App.byName[oldName];
            note.name = wantName;
            $('note-file').textContent = wantName;
            history.replaceState(null, '', '#/note/' + encodeURIComponent(wantName) +
              (App.mode === 'edit' ? '/edit' : ''));
            toast(oldName + ' → ' + wantName);
          });
        }
      })
      .then(function () {
        note.raw = raw;
        note.title = fresh.title;
        note.tags = fresh.tags;
        note.plain = fresh.plain;
        note.hasImage = fresh.hasImage;
        note.meta = fresh.meta;
        note.mtime = now;
        note.created = fresh.created;
        note.updated = fresh.updated;
        note.stamped = true;
        var tagsChanged = oldTags.join('|') !== note.tags.join('|');
        reindex();
        renderTagRow(note);
        renderDates(note);
        if (tagsChanged) { saveTags(); if (!$('view-home').hidden) renderMap(); }
        $('note-status').textContent = Store.mode === 'github' ? 'committed' : 'saved';
        $('note-status').classList.add('saved');
        setTimeout(function () {
          if (!App.dirty) $('note-status').textContent = '';
        }, 1800);
      })
      .catch(function (e) {
        if (e && e.conflict) return resolveConflict(note, raw, e.remoteText);
        App.dirty = true;
        $('note-status').textContent = 'save failed';
        toast(e.message || String(e), true);
      });
  }

  /* The file moved on GitHub while this tab held it open. Only the person
     who wrote both versions can say which one is right, so ask - and never
     drop either side without saying so. */
  function resolveConflict(note, mine, theirs) {
    $('note-status').textContent = 'changed on GitHub';
    var keepMine = confirm(
      note.name + ' was changed on GitHub while you had it open here.\n\n' +
      'The two versions no longer match, so one has to win:\n\n' +
      'OK  —  keep what is on this screen and overwrite GitHub\n' +
      'Cancel  —  discard what is on this screen and load the GitHub version');

    if (!keepMine) {
      App.dirty = false;
      adoptRemote(note, theirs);
      $('note-status').textContent = '';
      toast('Loaded the GitHub version of ' + note.name);
      return;
    }
    $('note-status').textContent = 'committing…';
    return Store.writeNote(note.name, mine, { force: true }).then(function () {
      App.dirty = false;
      adoptRemote(note, mine);
      $('note-status').textContent = 'committed';
      $('note-status').classList.add('saved');
      toast('Overwrote the GitHub version of ' + note.name);
    }).catch(function (err) {
      App.dirty = true;
      $('note-status').textContent = 'save failed';
      toast(err.message || String(err), true);
    });
  }

  /* ------------------------------ new/del ----------------------------- */

  function newNote() {
    var base = 'note-' + today();
    var name = uniqueName(base);
    var now = Date.now();
    var raw = MD.setFrontMatter('# Untitled\n\n#inbox\n\n', { created: iso(now), updated: iso(now) });
    var at = raw.indexOf('# Untitled') + 2;
    Store.writeNote(name, raw).then(function () {
      var note = indexNote(name, raw, now);
      App.notes.unshift(note);
      reindex();
      saveTags();
      go('#/note/' + encodeURIComponent(name) + '/edit');
      setTimeout(function () {
        var ta = $('note-edit');
        ta.focus();
        ta.setSelectionRange(at, at + 8);   /* select "Untitled" */
      }, 40);
    }).catch(function (e) { toast(e.message || String(e), true); });
  }

  function deleteCurrent() {
    var note = App.current;
    if (!note) return;
    if (!confirm('Delete "' + note.title + '"?\n\n' + note.name + ' will be removed from ' +
      (Store.mode === 'fs' ? 'the folder.' : 'this browser.'))) return;
    clearTimeout(App.saveTimer);
    App.dirty = false;
    Store.deleteNote(note.name).then(function () {
      App.notes = App.notes.filter(function (n) { return n.name !== note.name; });
      App.current = null;
      reindex();
      saveTags();
      toast('Deleted ' + note.name);
      go('#/');
    }).catch(function (e) { toast(e.message || String(e), true); });
  }

  function downloadCurrent() {
    var note = App.current;
    if (!note) return;
    var blob = new Blob([note.raw], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = note.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ------------------------------ images ------------------------------ */

  function insertAtCursor(text) {
    var ta = $('note-edit');
    var start = ta.selectionStart, end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
    markDirty();
  }

  function embedImage(blob) {
    var hint = App.current ? App.current.title : 'image';
    var placeholder = '![uploading…]()';
    insertAtCursor(placeholder);
    return Store.saveImage(blob, hint).then(function (src) {
      var ta = $('note-edit');
      var at = ta.value.indexOf(placeholder);
      var md = '![](' + src + ')';
      if (at >= 0) {
        ta.value = ta.value.slice(0, at) + md + ta.value.slice(at + placeholder.length);
        ta.selectionStart = ta.selectionEnd = at + md.length;
      } else {
        insertAtCursor(md);
      }
      markDirty();
      flushSave();
      if (Store.mode !== 'fs') {
        toast('Image embedded as a data URI — connect a folder to keep images as files');
      }
    }).catch(function (e) { toast(e.message || String(e), true); });
  }

  /* Images chosen with the picker. Unlike paste and drop this can fire while
     the note is in view mode, so put the editor up and the caret at the end
     before anything is inserted. */
  function pickImages(files) {
    var imgs = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) {
      if (files.length) toast('That file is not an image', true);
      return;
    }
    if (!App.current) return;
    if (App.mode !== 'edit') setMode('edit');
    var ta = $('note-edit');
    /* land the image in its own paragraph, not glued to the last line */
    if (ta.value.length) ta.value = ta.value.replace(/\n*$/, '\n\n');
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    imgs.forEach(embedImage);
  }

  function filesFromEvent(e) {
    var out = [];
    var dt = e.clipboardData || e.dataTransfer;
    if (!dt) return out;
    if (dt.files && dt.files.length) {
      for (var i = 0; i < dt.files.length; i++) out.push(dt.files[i]);
    } else if (dt.items) {
      for (var j = 0; j < dt.items.length; j++) {
        if (dt.items[j].kind === 'file') {
          var f = dt.items[j].getAsFile();
          if (f) out.push(f);
        }
      }
    }
    return out.filter(function (f) { return /^image\//.test(f.type); });
  }

  /* ============================= tag panel ============================= */

  var panelTag = null;

  /* Left pane: every note carrying this hashtag. */
  function notesForTag(tag, withDescendants) {
    var want = Object.create(null);
    want[tag] = true;
    if (withDescendants) {
      Object.keys(Tags.descendants(tag)).forEach(function (d) { want[d] = true; });
    }
    return App.notes.filter(function (n) {
      for (var i = 0; i < n.tags.length; i++) if (want[n.tags[i]]) return true;
      return false;
    }).map(function (n) {
      var via = n.tags.filter(function (t) { return want[t] && t !== tag; });
      return { note: n, via: via };
    });
  }

  function renderNotesPanel() {
    if (!panelTag) return;
    var deep = $('np-descend').checked;
    var rows = notesForTag(panelTag, deep);

    $('notes-panel').hidden = false;
    $('np-title').textContent = '#' + panelTag;
    $('np-all').href = '#/q/' + encodeURIComponent(deep ? '#' + panelTag : 'tag:=' + panelTag);

    var list = $('np-list');
    list.innerHTML = '';
    rows.forEach(function (row) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#/note/' + encodeURIComponent(row.note.name);

      var t = document.createElement('div');
      t.className = 'np-title';
      t.textContent = row.note.title;
      a.appendChild(t);

      var s = document.createElement('div');
      s.className = 'np-sub';
      s.textContent = fmtDate(row.note.updated) + ' · ' + row.note.name;
      s.title = datesTooltip(row.note);
      if (row.via.length) {
        var via = document.createElement('span');
        via.className = 'np-via';
        via.textContent = '  via #' + row.via.join(' #');
        s.appendChild(via);
      }
      a.appendChild(s);

      li.appendChild(a);
      list.appendChild(li);
    });

    $('np-empty').hidden = rows.length > 0;
    $('np-empty').textContent = deep
      ? 'No notes carry #' + panelTag + ' or anything below it yet.'
      : 'No notes carry #' + panelTag + ' itself. Try including the hashtags below it.';
  }

  function openTagPanel(name) {
    panelTag = Tags.normalize(name);
    if (App.graph) App.graph.select(panelTag);
    var rec = Tags.ensure(panelTag);
    renderNotesPanel();
    $('tag-panel').hidden = false;
    $('tp-name').textContent = '#' + panelTag;
    $('tp-count').textContent = rec.count;
    $('tp-open').href = '#/tag/' + encodeURIComponent(panelTag);
    $('tp-rename-input').value = '';
    $('tp-parent-input').value = '';
    $('tp-sibling-input').value = '';

    chips($('tp-parents'), Tags.parentsOf(panelTag), function (p) {
      Tags.removeParent(panelTag, p); commitTags();
    });
    chips($('tp-children'), Tags.children(panelTag), null);
    chips($('tp-siblings'), Tags.siblingsOf(panelTag), function (s) {
      Tags.removeSibling(panelTag, s); commitTags();
    });
  }

  function closeTagPanel() {
    panelTag = null;
    $('tag-panel').hidden = true;
    $('notes-panel').hidden = true;
    if (App.graph) App.graph.select(null);
  }

  function chips(host, names, onRemove) {
    host.innerHTML = '';
    names.forEach(function (n) {
      var chip = document.createElement('span');
      chip.className = 'chip';
      var label = document.createElement('a');
      label.href = '#';
      label.textContent = '#' + n;
      label.style.color = 'inherit';
      label.style.textDecoration = 'none';
      label.addEventListener('click', function (e) { e.preventDefault(); openTagPanel(n); });
      chip.appendChild(label);
      if (onRemove) {
        var x = document.createElement('button');
        x.type = 'button';
        x.textContent = '×';
        x.title = 'Remove';
        x.addEventListener('click', function (e) { e.preventDefault(); onRemove(n); });
        chip.appendChild(x);
      }
      host.appendChild(chip);
    });
  }

  function commitTags() {
    reindex();
    saveTags();
    renderMap();
    if (panelTag) openTagPanel(panelTag);
  }

  function renameTagEverywhere(from, to) {
    from = Tags.normalize(from);
    to = Tags.normalize(to);
    if (!to || from === to) return;
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_\-\/]*$/u.test(to)) { toast('Hashtags allow letters, digits, _ - and /', true); return; }

    var re = new RegExp('(^|[\\s(\\[>,;])#' + escapeRe(from) + '(?![\\p{L}\\p{N}_\\-/])', 'gu');
    var jobs = [];
    var now = Date.now();
    App.notes.forEach(function (n) {
      if (n.tags.indexOf(from) === -1) return;
      var swapped = n.raw.replace(re, '$1#' + to);
      if (swapped === n.raw) return;
      /* the file really did change, so its modified date really did move */
      var next = MD.setFrontMatter(swapped, {
        created: iso(n.created || now), updated: iso(now)
      });
      n.raw = next;
      var upd = indexNote(n.name, next, now);
      n.tags = upd.tags; n.plain = upd.plain; n.title = upd.title;
      n.created = upd.created; n.updated = upd.updated; n.stamped = true;
      jobs.push(Store.writeNote(n.name, next));
    });
    Tags.rename(from, to);
    Promise.all(jobs).then(function () {
      panelTag = to;
      commitTags();
      if (App.current && App.mode === 'view') renderMarkdown(App.current.raw);
      if (App.current) { renderTagRow(App.current); renderDates(App.current); }
      toast('#' + from + ' → #' + to + ' in ' + jobs.length + ' note' + (jobs.length === 1 ? '' : 's'));
    }).catch(function (e) { toast(e.message || String(e), true); });
  }

  /* =============================== import ============================== */

  function importFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) { return /\.(md|markdown|txt)$/i.test(f.name); });
    if (!files.length) { toast('Pick one or more .md files', true); return; }
    Promise.all(files.map(function (f) {
      return f.text().then(function (text) {
        var name = f.name.replace(/\.(markdown|txt)$/i, '.md');
        var i = 2;
        while (App.byName[name]) { name = f.name.replace(/\.md$/i, '') + '-' + (i++) + '.md'; }
        /* keep whatever dates the file already carries; otherwise the best
           we know about it is when the file itself was last written */
        var meta = MD.stripFrontMatter(text).meta;
        var when = f.lastModified || Date.now();
        return Store.writeNote(name, MD.setFrontMatter(text, {
          created: iso(metaTime(meta, CREATED_KEYS) || when),
          updated: iso(metaTime(meta, UPDATED_KEYS) || when)
        }));
      });
    })).then(loadAll).then(function () {
      toast('Imported ' + files.length + ' note' + (files.length === 1 ? '' : 's'));
      saveTags();
    }).catch(function (e) { toast(e.message || String(e), true); });
  }

  /* ================================ theme ============================== */

  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  function cycleTheme() {
    var cur = Store.setting('theme') || 'auto';
    var next = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
    Store.setting('theme', next);
    applyTheme(next);
    toast('Theme: ' + next);
  }

  /* =============================== events ============================== */

  function bind() {
    window.addEventListener('hashchange', route);
    window.addEventListener('beforeunload', function (e) {
      if (App.dirty) { flushSave(); e.preventDefault(); e.returnValue = ''; }
    });

    wireNoteLinks();
    $('btn-connect').addEventListener('click', connectFolder);
    $('btn-github').addEventListener('click', openGitHubSheet);
    $('storage-pill').addEventListener('click', openGitHubSheet);
    $('banner-github').addEventListener('click', openGitHubSheet);
    $('gh-close').addEventListener('click', closeGitHubSheet);
    $('gh-cancel').addEventListener('click', closeGitHubSheet);
    $('gh-save').addEventListener('click', submitGitHub);
    $('gh-disconnect').addEventListener('click', disconnectGitHub);
    $('gh-overlay').addEventListener('click', function (e) {
      if (e.target === $('gh-overlay')) closeGitHubSheet();
    });
    ['gh-owner', 'gh-repo', 'gh-branch', 'gh-token'].forEach(function (id) {
      $(id).addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submitGitHub(); }
      });
    });
    $('btn-new').addEventListener('click', newNote);
    $('btn-theme').addEventListener('click', cycleTheme);
    $('btn-import').addEventListener('click', function () { $('file-import').click(); });
    $('file-import').addEventListener('change', function () {
      importFiles(this.files);
      this.value = '';
    });

    /* search */
    $('search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = $('q').value.trim();
      if (!q) { go('#/'); return; }
      go('#/q/' + encodeURIComponent(q));
    });
    $('q').addEventListener('input', function () {
      var q = this.value.trim();
      var msg = $('search-msg');
      syncDateFilter();
      if (!q) { msg.textContent = ''; msg.classList.remove('error'); applyLiveHighlight(); return; }
      var compiled = Search.compile(q);
      if (!compiled.ok) {
        msg.textContent = compiled.error;
        msg.classList.add('error');
      } else {
        var count = App.notes.filter(compiled.test).length;
        msg.textContent = count + (count === 1 ? ' note matches' : ' notes match') + ' — press Enter';
        msg.classList.remove('error');
      }
      applyLiveHighlight();
    });
    $('btn-help').addEventListener('click', function () {
      var h = $('help');
      h.hidden = !h.hidden;
    });

    /* date filter */
    $('btn-dates').addEventListener('click', function () {
      var d = $('date-filter');
      d.hidden = !d.hidden;
      if (!d.hidden) $('df-from').focus();
    });
    $('df-field').addEventListener('change', applyDateFilter);
    $('df-from').addEventListener('change', applyDateFilter);
    $('df-to').addEventListener('change', applyDateFilter);
    $('df-clear').addEventListener('click', clearDateFilter);
    Array.prototype.forEach.call($('date-filter').querySelectorAll('[data-range]'), function (b) {
      b.addEventListener('click', function () { setPreset(b.getAttribute('data-range')); });
    });

    /* map tools */
    $('btn-fit').addEventListener('click', function () { App.graph && App.graph.fit(); });
    $('btn-relayout').addEventListener('click', function () {
      if (!App.graph) return;
      App.graph.relayout();
      App.graph.fit();
    });
    /* notes pane */
    $('np-close').addEventListener('click', function () { $('notes-panel').hidden = true; });
    $('np-descend').addEventListener('change', renderNotesPanel);

    /* tag panel */
    $('tp-close').addEventListener('click', closeTagPanel);
    $('tp-parent-add').addEventListener('click', function () {
      var v = Tags.normalize($('tp-parent-input').value);
      if (!v || !panelTag) return;
      if (!Tags.addParent(panelTag, v)) { toast('That would make a loop in the hierarchy', true); return; }
      commitTags();
    });
    $('tp-sibling-add').addEventListener('click', function () {
      var v = Tags.normalize($('tp-sibling-input').value);
      if (!v || !panelTag) return;
      Tags.addSibling(panelTag, v);
      commitTags();
    });
    ['tp-parent-input', 'tp-sibling-input', 'tp-rename-input'].forEach(function (id) {
      $(id).addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (id === 'tp-parent-input') $('tp-parent-add').click();
        else if (id === 'tp-sibling-input') $('tp-sibling-add').click();
        else $('tp-rename').click();
      });
    });
    $('tp-rename').addEventListener('click', function () {
      if (!panelTag) return;
      renameTagEverywhere(panelTag, $('tp-rename-input').value);
    });
    /* note surface */
    $('btn-mode-view').addEventListener('click', function () { flushSave(); setMode('view'); });
    $('btn-mode-edit').addEventListener('click', function () { setMode('edit'); });
    $('btn-delete').addEventListener('click', deleteCurrent);
    $('btn-download').addEventListener('click', downloadCurrent);

    $('btn-image').addEventListener('click', function () { $('file-image').click(); });
    $('file-image').addEventListener('change', function (e) {
      var picked = Array.prototype.slice.call(e.target.files || []);
      e.target.value = '';                  /* so picking the same file twice fires */
      pickImages(picked);
    });

    var ta = $('note-edit');
    ta.addEventListener('input', markDirty);
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        insertAtCursor('    ');
      }
    });
    ta.addEventListener('paste', function (e) {
      var imgs = filesFromEvent(e);
      if (!imgs.length) return;
      e.preventDefault();
      imgs.forEach(embedImage);
    });
    ta.addEventListener('dragover', function (e) {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') === -1) return;
      e.preventDefault();
      ta.classList.add('dropping');
    });
    ta.addEventListener('dragleave', function () { ta.classList.remove('dropping'); });
    ta.addEventListener('drop', function (e) {
      var imgs = filesFromEvent(e);
      ta.classList.remove('dropping');
      if (!imgs.length) return;
      e.preventDefault();
      imgs.forEach(embedImage);
    });

    bindHighlights();

    /* keyboard */
    document.addEventListener('keydown', function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      var mod = e.ctrlKey || e.metaKey;

      if (e.key === 'Escape' && !$('gh-overlay').hidden) { closeGitHubSheet(); return; }

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushSave();
        if (!App.dirty) toast('Saved');
        return;
      }
      if (mod && e.key.toLowerCase() === 'e' && App.current) {
        e.preventDefault();
        flushSave();
        setMode(App.mode === 'edit' ? 'view' : 'edit');
        return;
      }
      if (inField) {
        if (e.key === 'Escape' && document.activeElement.id === 'q') document.activeElement.blur();
        return;
      }
      if (e.key === '/') { e.preventDefault(); go('#/'); setTimeout(function () { $('q').focus(); }, 20); return; }
      if (e.key === 'n') { e.preventDefault(); newNote(); return; }
      if (e.key === 'Escape') { closeTagPanel(); }
    });

    window.addEventListener('resize', function () {
      if (App.graph && !$('view-home').hidden) App.graph.paint();
    });

    /* coming back to the tab is the moment to check the note is still what
       the repo says it is - see resyncCurrent */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) resyncCurrent();
    });
    window.addEventListener('focus', function () { resyncCurrent(); });
  }

  /* ====================== highlights and their notes ===================
   * Select something in a note and a small menu replaces the browser's own:
   * highlight it, copy it, or have Claude sum it up in under ten words and
   * pin that summary to the highlight as its note.
   *
   * Nothing here keeps state of its own. The highlight *is* the ==text== in
   * the .md file, and the note *is* the {braces} behind it, so a highlight
   * and its note travel together through GitHub, a folder, a download and
   * an import, and neither can be orphaned by the other going missing.
   *
   * The one hard part is aiming: the reader selects rendered words, and we
   * have to point at the same words in the markdown behind them. HL.locate
   * does that work; everything here checks it landed - the note is
   * re-rendered and the new highlight must read back exactly as selected,
   * or the edit is thrown away and nothing is written.
   * ================================================================== */

  var hlMenu = null;

  function closeHlMenu() {
    if (hlMenu && hlMenu.parentNode) hlMenu.parentNode.removeChild(hlMenu);
    hlMenu = null;
    var open = $('note-view').querySelector('mark.hl.open');
    if (open) open.classList.remove('open');
  }

  /* Anchored to the page, not the window, so scrolling does not leave the
     menu hovering over the wrong paragraph. */
  function openHlMenu(rect, build, stack) {
    closeHlMenu();
    var m = document.createElement('div');
    m.className = 'sel-menu' + (stack ? ' stack' : '');
    m.setAttribute('role', 'menu');
    build(m);
    m.style.visibility = 'hidden';
    document.body.appendChild(m);
    hlMenu = m;

    var pad = 8;
    var w = m.offsetWidth, h = m.offsetHeight;
    var left = rect.left + window.scrollX + (rect.width - w) / 2;
    var top = rect.top + window.scrollY - h - 6;
    if (top < window.scrollY + pad) top = rect.bottom + window.scrollY + 6;
    left = Math.max(window.scrollX + pad,
      Math.min(left, window.scrollX + document.documentElement.clientWidth - w - pad));
    m.style.left = Math.round(left) + 'px';
    m.style.top = Math.round(top) + 'px';
    m.style.visibility = '';
    return m;
  }

  function menuButton(label, fn, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    if (cls) b.className = cls;
    if (typeof label === 'string') b.textContent = label; else b.appendChild(label);
    b.addEventListener('click', fn);
    return b;
  }

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  /* ---------------------- writing a highlight in ---------------------- */

  function markTexts(raw) {
    var probe = document.createElement('div');
    probe.appendChild(Sanitize.toFragment(MD.render(raw)));
    return Array.prototype.map.call(probe.querySelectorAll('mark.hl'), function (el) {
      return norm(el.textContent);
    });
  }

  /* Returns true only if the note now renders a highlight reading exactly
     what was selected. Anything else and the file is left untouched. */
  function commitHighlight(text, ratio, note) {
    var current = App.current;
    if (!current) return false;
    var at = HL.locate(current.raw, text, ratio);
    if (!at) {
      toast('Could not place that in the file — try selecting a shorter run of plain text', true);
      return false;
    }
    var next = HL.wrap(current.raw, at.start, at.end, note || '');
    var was = markTexts(current.raw), now = markTexts(next);
    if (now.length !== was.length + 1 || now.indexOf(norm(text)) === -1) {
      toast('That selection crosses something the file cannot mark — try a shorter one', true);
      return false;
    }
    current.raw = next;
    renderMarkdown(current.raw);
    markDirty();
    return true;
  }

  /* ------------------- pointing at an existing highlight -------------- */

  function highlightUnder(el) {
    var all = $('note-view').querySelectorAll('mark.hl');
    var i = Array.prototype.indexOf.call(all, el);
    var list = HL.scan(App.current ? App.current.raw : '');
    if (i === -1 || list.length !== all.length) return null;
    return list[i];
  }

  function rewriteHighlight(el, make) {
    var current = App.current;
    var hl = current && highlightUnder(el);
    if (!hl) { toast('Lost track of that highlight — reopen the note and try again', true); return; }
    current.raw = make(current.raw, hl);
    renderMarkdown(current.raw);
    markDirty();
    closeHlMenu();
  }

  /* ------------------------- the selection menu ----------------------- */

  function selectionInNote() {
    if (App.mode !== 'view' || !App.current) return null;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var view = $('note-view');
    var range = sel.getRangeAt(0);
    if (!view.contains(range.commonAncestorContainer)) return null;
    var text = norm(sel.toString());
    if (text.length < 2) return null;

    /* where the selection sits in the note, 0 to 1 - this is what tells
       HL.locate which "the quick brown fox" the reader meant */
    var before = document.createRange();
    before.selectNodeContents(view);
    before.setEnd(range.startContainer, range.startOffset);
    var whole = view.textContent.length || 1;

    return { text: text, ratio: before.toString().length / whole, rect: range.getBoundingClientRect() };
  }

  function showSelectionMenu(pick, at) {
    openHlMenu(at || pick.rect, function (m) {
      var swatch = document.createElement('span');
      swatch.className = 'swatch';
      var hi = document.createElement('span');
      hi.appendChild(swatch);
      hi.appendChild(document.createTextNode('Highlight'));

      m.appendChild(menuButton(hi, function () {
        closeHlMenu();
        if (commitHighlight(pick.text, pick.ratio, '')) window.getSelection().removeAllRanges();
      }));

      m.appendChild(menuButton('Copy', function () {
        var done = function () { toast('Copied'); closeHlMenu(); };
        var fail = function () { toast('This browser would not let JoeNote copy that', true); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(pick.text).then(done, fail);
        } else fail();
      }));

      var ai = menuButton('10-word summary', function () {
        ai.disabled = true;
        ai.textContent = 'summarising…';
        HL.summarize(pick.text).then(function (summary) {
          closeHlMenu();
          if (commitHighlight(pick.text, pick.ratio, summary)) {
            window.getSelection().removeAllRanges();
            toast(summary);
          }
        }).catch(function (e) {
          closeHlMenu();
          toast(e.message || String(e), true);
          if (!HL.key()) openAiSheet();
        });
      });
      m.appendChild(ai);
    });
  }

  /* --------------------- the menu on a highlight ---------------------- */

  function showHighlightMenu(el, at) {
    el.classList.add('open');
    var note = el.getAttribute('data-note') || '';

    openHlMenu(at || el.getBoundingClientRect(), function (m) {
      if (note) {
        var read = document.createElement('div');
        read.className = 'note-read';
        read.textContent = note;
        m.appendChild(read);
      }
      m.appendChild(menuButton(note ? 'Edit note' : 'Add a note', function () {
        showNoteEditor(el, note);
      }));
      m.appendChild(menuButton('Remove highlight', function () {
        rewriteHighlight(el, HL.remove);
      }, 'danger'));
    }, true);
  }

  function showNoteEditor(el, note) {
    var rect = el.getBoundingClientRect();
    openHlMenu(rect, function (m) {
      var ta = document.createElement('textarea');
      ta.value = note;
      ta.placeholder = 'A note on this highlight. It lives inside the highlight, so removing the highlight removes it too.';
      m.appendChild(ta);

      var row = document.createElement('div');
      row.className = 'row';
      row.appendChild(menuButton('Cancel', function () { closeHlMenu(); }));
      row.appendChild(menuButton('Save', function () {
        var value = ta.value;
        rewriteHighlight(el, function (raw, hl) { return HL.setNote(raw, hl, value); });
      }, 'primary'));
      m.appendChild(row);

      setTimeout(function () { ta.focus(); ta.select(); }, 0);
    }, true);
  }

  /* ----------------------------- the key ------------------------------ */

  function openAiSheet() {
    $('ai-key').value = HL.key();
    $('ai-overlay').hidden = false;
    $('ai-msg').textContent = '';
    setTimeout(function () { $('ai-key').focus(); }, 0);
  }

  function closeAiSheet() { $('ai-overlay').hidden = true; }

  /* ------------------------------ wiring ------------------------------ */

  function bindHighlights() {
    var view = $('note-view');

    function offer(at) {
      var pick = selectionInNote();
      if (!pick) return false;
      showSelectionMenu(pick, at);
      return true;
    }

    /* A tap or a click on a highlight opens its own menu; the selection
       menu waits for the pointer to come up, so dragging out a phrase does
       not flash a menu at every character along the way. */
    view.addEventListener('click', function (e) {
      var mark = e.target.closest ? e.target.closest('mark.hl') : null;
      if (!mark || !view.contains(mark)) return;
      if (App.mode !== 'view') return;
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;      /* they are selecting, not tapping */
      e.preventDefault();
      e.stopPropagation();
      showHighlightMenu(mark);
    });

    view.addEventListener('mouseup', function () { setTimeout(function () { offer(); }, 0); });
    view.addEventListener('touchend', function () { setTimeout(function () { offer(); }, 10); });

    /* the browser's own menu steps aside for ours */
    view.addEventListener('contextmenu', function (e) {
      if (App.mode !== 'view') return;
      var pointer = { left: e.clientX, top: e.clientY, right: e.clientX, bottom: e.clientY, width: 0, height: 0 };
      var mark = e.target.closest ? e.target.closest('mark.hl') : null;
      if (selectionInNote()) { e.preventDefault(); offer(pointer); return; }
      if (mark && view.contains(mark)) { e.preventDefault(); showHighlightMenu(mark, pointer); }
    });

    document.addEventListener('mousedown', function (e) {
      if (hlMenu && !hlMenu.contains(e.target)) closeHlMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hlMenu) { closeHlMenu(); return; }
      if (e.key === 'Escape' && !$('ai-overlay').hidden) closeAiSheet();
    });
    window.addEventListener('hashchange', closeHlMenu);
    window.addEventListener('resize', closeHlMenu);
    document.addEventListener('scroll', function () { if (hlMenu) closeHlMenu(); }, true);

    /* the key sheet */
    $('btn-ai').addEventListener('click', openAiSheet);
    $('ai-close').addEventListener('click', closeAiSheet);
    $('ai-cancel').addEventListener('click', closeAiSheet);
    $('ai-clear').addEventListener('click', function () {
      HL.key('');
      $('ai-key').value = '';
      $('ai-msg').textContent = 'Key removed from this browser.';
      toast('Anthropic key removed');
    });
    $('ai-save').addEventListener('click', function () {
      var v = $('ai-key').value.trim();
      if (!v) { $('ai-msg').textContent = 'Paste a key first, or press Remove.'; return; }
      HL.key(v);
      closeAiSheet();
      toast('Anthropic key saved in this browser');
    });
    $('ai-overlay').addEventListener('click', function (e) {
      if (e.target === $('ai-overlay')) closeAiSheet();
    });
  }

  /* ================================ boot =============================== */

  function boot() {
    applyTheme(Store.setting('theme') || 'auto');
    bind();
    Store.init()
      .then(loadAll)
      .then(function () {
        App.booted = true;
        route();
      })
      .catch(function (e) {
        console.error(e);
        toast(e.message || String(e), true);
        route();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
