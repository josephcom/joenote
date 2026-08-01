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
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
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
    return {
      name: name,
      raw: raw,
      mtime: mtime || 0,
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
        .sort(function (a, b) { return b.mtime - a.mtime; });
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

  function route() {
    var h = location.hash.replace(/^#/, '') || '/';
    var parts = h.split('/').filter(function (s) { return s !== ''; });

    if (parts[0] === 'note' && parts[1]) {
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

  /* ============================== results ============================== */

  function showResults(query) {
    flushSave();
    setView('view-results');
    $('q').value = query;
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

    if (mode === 'edit') {
      var ta = $('note-edit');
      if (ta.value !== note.raw) ta.value = note.raw;
      setTimeout(function () { ta.focus(); }, 0);
    } else {
      renderMarkdown(note.raw);
    }

    var want = '#/note/' + encodeURIComponent(note.name) + (mode === 'edit' ? '/edit' : '');
    if (location.hash !== want) history.replaceState(null, '', want);
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
    var raw = $('note-edit').hidden ? note.raw : $('note-edit').value;
    var oldTitle = note.title;
    var oldTags = note.tags.slice();

    var updated = indexNote(note.name, raw, Date.now());
    var wantName = note.name;

    /* the file name follows the title (announced by a toast, never silent) */
    if (updated.title !== oldTitle) {
      var candidate = slug(updated.title) + '.md';
      if (candidate !== note.name && !App.byName[candidate]) wantName = candidate;
    }

    App.dirty = false;
    $('note-status').textContent = Store.mode === 'github' ? 'committing…' : 'saving…';
    return Store.writeNote(note.name, raw)
      .then(function () {
        if (wantName !== note.name) {
          var oldName = note.name;
          return Store.renameNote(oldName, wantName).then(function () {
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
        note.title = updated.title;
        note.tags = updated.tags;
        note.plain = updated.plain;
        note.hasImage = updated.hasImage;
        note.mtime = Date.now();
        var tagsChanged = oldTags.join('|') !== note.tags.join('|');
        reindex();
        renderTagRow(note);
        if (tagsChanged) { saveTags(); if (!$('view-home').hidden) renderMap(); }
        $('note-status').textContent = Store.mode === 'github' ? 'committed' : 'saved';
        $('note-status').classList.add('saved');
        setTimeout(function () {
          if (!App.dirty) $('note-status').textContent = '';
        }, 1800);
      })
      .catch(function (e) {
        App.dirty = true;
        $('note-status').textContent = 'save failed';
        toast(e.message || String(e), true);
      });
  }

  /* ------------------------------ new/del ----------------------------- */

  function newNote() {
    var base = 'note-' + today();
    var name = uniqueName(base);
    var raw = '# Untitled\n\n#inbox\n\n';
    Store.writeNote(name, raw).then(function () {
      var note = indexNote(name, raw, Date.now());
      App.notes.unshift(note);
      reindex();
      saveTags();
      go('#/note/' + encodeURIComponent(name) + '/edit');
      setTimeout(function () {
        var ta = $('note-edit');
        ta.focus();
        ta.setSelectionRange(2, 10);   /* select "Untitled" */
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
      s.textContent = row.note.name;
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
    App.notes.forEach(function (n) {
      if (n.tags.indexOf(from) === -1) return;
      var next = n.raw.replace(re, '$1#' + to);
      if (next === n.raw) return;
      n.raw = next;
      var upd = indexNote(n.name, next, Date.now());
      n.tags = upd.tags; n.plain = upd.plain; n.title = upd.title;
      jobs.push(Store.writeNote(n.name, next));
    });
    Tags.rename(from, to);
    Promise.all(jobs).then(function () {
      panelTag = to;
      commitTags();
      if (App.current && App.mode === 'view') renderMarkdown(App.current.raw);
      if (App.current) renderTagRow(App.current);
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
        return Store.writeNote(name, text);
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

    /* map tools */
    $('btn-fit').addEventListener('click', function () { App.graph && App.graph.fit(); });
    $('btn-relayout').addEventListener('click', function () {
      if (!App.graph) return;
      App.graph.nodes.forEach(function (n) {
        n.x += (Math.random() - 0.5) * 160;
        n.y += (Math.random() - 0.5) * 160;
      });
      App.graph.kick(1);
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
