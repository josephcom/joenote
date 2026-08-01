/* JoeNote - js/store.js
 * Persistence. Three backends, and the app always says which one is live:
 *
 *   github - commits straight to a GitHub repo through the Contents API.
 *            What you see in JoeNote is what is in the repo. Needs a token.
 *   fs     - File System Access API pointed at a folder on this computer.
 *            Real notes/*.md files; you push them yourself.
 *   local  - localStorage. Nothing leaves this browser. The fallback.
 *
 * Layout is the same in all three: notes/*.md, assets/*, tags.xml.
 */
(function (global) {
  'use strict';

  var NOTES_DIR = 'notes';
  var ASSETS_DIR = 'assets';
  var TAGS_FILE = 'tags.xml';
  var LS = 'joenote:';
  var IDB_NAME = 'joenote';
  var IDB_STORE = 'handles';

  /* ---------------- IndexedDB (only to remember the folder) ----------- */

  function idb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error('no indexedDB'));
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbGet(key) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
        tx.onsuccess = function () { resolve(tx.result); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(key, val) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(val, key);
        tx.onsuccess = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { });
  }

  /* ---------------- encoding helpers --------------------------------- */

  function toBase64(bytes) {
    var bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function encodeText(str) { return toBase64(new TextEncoder().encode(str)); }
  function decodeText(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeBlob(blob) {
    return blob.arrayBuffer().then(function (buf) { return toBase64(new Uint8Array(buf)); });
  }

  /* raw.githubusercontent.com serves files with max-age=300, so a note read
     back just after a commit can be the pre-commit copy. Key the URL on the
     blob sha: it changes exactly when the content does. */
  function bustCache(url, sha) {
    if (!sha) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'jn=' + encodeURIComponent(sha);
  }
  function readBlobAsDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  function extFromType(type) {
    var map = {
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/avif': 'avif', 'image/bmp': 'bmp'
    };
    return map[type] || 'png';
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  /* ---------------- GitHub --------------------------------------------
   * Every write is a commit, so they are queued: two commits racing on the
   * same file would collide on the blob sha.
   * ------------------------------------------------------------------ */

  var queue = Promise.resolve();
  function serial(fn) {
    var run = queue.then(fn, fn);
    queue = run.then(function () { }, function () { });
    return run;
  }

  function ghError(res, body) {
    var msg = (body && body.message) || ('HTTP ' + res.status);
    if (res.status === 401) return 'GitHub rejected the token (401). Check it has not expired.';
    if (res.status === 403 && /rate limit/i.test(msg)) return 'GitHub rate limit reached. Try again shortly.';
    if (res.status === 403) return 'GitHub refused the write (403). The token needs Contents: Read and write on this repo.';
    if (res.status === 404) return 'Not found on GitHub (404). Check the owner, repo and branch.';
    if (res.status === 409 || res.status === 422) return 'That file changed on GitHub since it was loaded. Reload and try again.';
    return 'GitHub: ' + msg;
  }

  /* Raised instead of overwriting a file that moved on underneath us. Carries
     the repo's current text so the caller can show it or adopt it. */
  function conflictError(remoteText) {
    var e = new Error('This file changed on GitHub since JoeNote read it.');
    e.conflict = true;
    e.remoteText = remoteText;
    return e;
  }

  var Store = {
    mode: 'local',
    root: null,            /* FileSystemDirectoryHandle */
    folderName: null,
    github: null,          /* { owner, repo, branch, token } */
    shas: Object.create(null),
    assetURLs: Object.create(null),

    supportsFS: typeof global.showDirectoryPicker === 'function',

    /* ---------- description of where writes land, for the UI ---------- */

    describe: function () {
      if (this.mode === 'github') {
        return {
          kind: 'github',
          label: 'GitHub · ' + this.github.owner + '/' + this.github.repo + '/' + NOTES_DIR,
          detail: 'Every save is a commit on branch ' + this.github.branch + '.',
          safe: true
        };
      }
      if (this.mode === 'fs') {
        return {
          kind: 'folder',
          label: 'Folder · ' + this.folderName + '/' + NOTES_DIR,
          detail: 'Real files on this computer. Nothing reaches GitHub until you push.',
          safe: true
        };
      }
      return {
        kind: 'local',
        label: 'This browser only',
        detail: 'Notes are in this browser\'s storage. They are not on GitHub and not in any folder.',
        safe: false
      };
    },

    /* ---------- boot: restore whichever backend was in use ----------- */

    init: function () {
      var self = this;
      var token = localStorage.getItem(LS + 'gh:token');
      if (token) {
        self.github = {
          token: token,
          owner: localStorage.getItem(LS + 'gh:owner') || '',
          repo: localStorage.getItem(LS + 'gh:repo') || '',
          branch: localStorage.getItem(LS + 'gh:branch') || 'main'
        };
        self.mode = 'github';
        return Promise.resolve(self.mode);
      }
      if (!self.supportsFS) return Promise.resolve(self.mode);
      return idbGet('root').then(function (handle) {
        if (!handle) return self.mode;
        return handle.queryPermission({ mode: 'readwrite' }).then(function (p) {
          if (p !== 'granted') return self.mode;
          self.root = handle;
          self.folderName = handle.name;
          self.mode = 'fs';
          return self.ensureLayout().then(function () { return self.mode; });
        });
      }).catch(function () { return self.mode; });
    },

    /* ---------- GitHub backend --------------------------------------- */

    /* Owner/repo guessed from the Pages URL this app is served from. */
    guessRepo: function () {
      var host = /^([^.]+)\.github\.io$/i.exec(location.hostname);
      var owner = host ? host[1] : '';
      var seg = location.pathname.split('/').filter(Boolean);
      var repo = host ? (seg.length ? seg[0] : owner + '.github.io') : '';
      return {
        owner: localStorage.getItem(LS + 'gh:owner') || owner,
        repo: localStorage.getItem(LS + 'gh:repo') || repo,
        branch: localStorage.getItem(LS + 'gh:branch') || 'main'
      };
    },

    api: function (path, opts) {
      var self = this;
      opts = opts || {};
      var headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (self.github && self.github.token) headers.Authorization = 'Bearer ' + self.github.token;
      if (opts.body) headers['Content-Type'] = 'application/json';
      return fetch('https://api.github.com/' + path, {
        method: opts.method || 'GET',
        headers: headers,
        /* never replay a cached copy: a stale read hands back an old note and
           an old sha, which then overwrites the newer commit */
        cache: 'no-store',
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (res) {
        return res.text().then(function (raw) {
          var body = null;
          try { body = raw ? JSON.parse(raw) : null; } catch (e) { }
          if (res.status === 404 && opts.allow404) return null;
          if (!res.ok) throw new Error(ghError(res, body));
          return body;
        });
      });
    },

    repoPath: function (rest) {
      return 'repos/' + this.github.owner + '/' + this.github.repo + '/' + rest;
    },

    /* contents/<path>, with each segment escaped and the ref attached */
    contentsPath: function (filePath, withRef) {
      var enc = String(filePath).split('/').map(encodeURIComponent).join('/');
      return this.repoPath('contents/' + enc +
        (withRef ? '?ref=' + encodeURIComponent(this.github.branch) : ''));
    },

    /* Verify the token can actually write, then switch the app over. */
    connectGitHub: function (cfg) {
      var self = this;
      var g = {
        owner: String(cfg.owner || '').trim(),
        repo: String(cfg.repo || '').trim(),
        branch: String(cfg.branch || 'main').trim() || 'main',
        token: String(cfg.token || '').trim()
      };
      if (!g.owner || !g.repo) return Promise.reject(new Error('Owner and repository are both required.'));
      if (!g.token) return Promise.reject(new Error('A token is required — JoeNote cannot write to GitHub without one.'));

      var prev = { mode: self.mode, github: self.github };
      self.github = g;
      self.mode = 'github';
      return self.api('repos/' + g.owner + '/' + g.repo)
        .then(function (repo) {
          if (!repo.permissions || !repo.permissions.push) {
            throw new Error('That token can read ' + g.owner + '/' + g.repo + ' but not write to it. ' +
              'It needs Contents: Read and write.');
          }
          return self.api(self.repoPath('branches/' + encodeURIComponent(g.branch)), { allow404: true });
        })
        .then(function (branch) {
          if (!branch) throw new Error('Branch "' + g.branch + '" does not exist in ' + g.owner + '/' + g.repo + '.');
          localStorage.setItem(LS + 'gh:token', g.token);
          localStorage.setItem(LS + 'gh:owner', g.owner);
          localStorage.setItem(LS + 'gh:repo', g.repo);
          localStorage.setItem(LS + 'gh:branch', g.branch);
          self.shas = Object.create(null);
          self.assetURLs = Object.create(null);
          return self.mode;
        })
        .catch(function (e) {
          self.mode = prev.mode;
          self.github = prev.github;
          throw e;
        });
    },

    disconnectGitHub: function () {
      ['token', 'owner', 'repo', 'branch'].forEach(function (k) { localStorage.removeItem(LS + 'gh:' + k); });
      this.github = null;
      this.shas = Object.create(null);
      this.mode = this.root ? 'fs' : 'local';
      return Promise.resolve(this.mode);
    },

    commitMessage: function (verb, name) {
      return verb + ' ' + name + ' (JoeNote)';
    },

    /* GitHub refuses the write when the blob sha we hold is no longer current,
       which is its way of saying the file changed underneath us - edited on
       github.com, or saved from another browser. Re-reading the fresh sha and
       committing anyway destroys whatever landed in between, silently, so the
       default is to stop and hand the caller the repo's text to reconcile
       against. opts.force is for the files JoeNote owns outright, where
       last-write-wins is what we actually want. */
    ghPut: function (path, contentB64, verb, name, opts) {
      var self = this;
      var force = !!(opts && opts.force);
      return serial(function () {
        function attempt(sha) {
          var body = {
            message: self.commitMessage(verb, name),
            content: contentB64,
            branch: self.github.branch
          };
          if (sha) body.sha = sha;
          return self.api(self.contentsPath(path, false), { method: 'PUT', body: body });
        }
        return attempt(self.shas[path]).catch(function (e) {
          if (!/changed on GitHub/.test(e.message)) throw e;
          return self.api(self.contentsPath(path, true), { allow404: true }).then(function (meta) {
            if (!meta) return attempt(null);            /* deleted meanwhile - recreate it */
            self.shas[path] = meta.sha;
            if (force || meta.content == null) return attempt(meta.sha);
            var remote = decodeText(meta.content);
            /* someone already committed exactly this: nothing left to do */
            if (remote === decodeText(contentB64)) return null;
            throw conflictError(remote);
          });
        }).then(function (res) {
          if (res && res.content) self.shas[path] = res.content.sha;
          return res;
        });
      });
    },

    /* ---------- folder backend --------------------------------------- */

    connect: function () {
      var self = this;
      if (!self.supportsFS) {
        return Promise.reject(new Error(
          'This browser has no File System Access API. Use Chrome or Edge, or connect GitHub instead.'));
      }
      return global.showDirectoryPicker({ id: 'joenote', mode: 'readwrite', startIn: 'documents' })
        .then(function (handle) {
          return handle.requestPermission({ mode: 'readwrite' }).then(function (p) {
            if (p !== 'granted') throw new Error('Write permission denied.');
            self.root = handle;
            self.folderName = handle.name;
            self.mode = 'fs';
            return idbSet('root', handle);
          });
        })
        .then(function () { return self.ensureLayout(); })
        .then(function () { return self.mode; });
    },

    disconnect: function () {
      this.root = null;
      this.folderName = null;
      this.mode = this.github ? 'github' : 'local';
      return idbSet('root', null);
    },

    ensureLayout: function () {
      var self = this;
      if (self.mode !== 'fs') return Promise.resolve();
      return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
        .then(function () { return self.root.getDirectoryHandle(ASSETS_DIR, { create: true }); })
        .then(function () { });
    },

    /* ---------- notes ------------------------------------------------ */

    listNotes: function () {
      var self = this;

      if (self.mode === 'github') {
        return self.api(self.contentsPath(NOTES_DIR, true), { allow404: true }).then(function (entries) {
            if (!entries || !entries.length) return [];
            var files = entries.filter(function (e) { return e.type === 'file' && /\.md$/i.test(e.name); });
            return Promise.all(files.map(function (e) {
              self.shas[NOTES_DIR + '/' + e.name] = e.sha;
              return fetch(bustCache(e.download_url, e.sha), { cache: 'no-store' })
                .then(function (r) { return r.text(); })
                .then(function (text) { return { name: e.name, text: text, mtime: 0 }; })
                .catch(function () { return { name: e.name, text: '', mtime: 0 }; });
            }));
          });
      }

      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true }).then(function (dir) {
          var jobs = [];
          return (async function () {
            for await (var entry of dir.values()) {
              if (entry.kind === 'file' && /\.md$/i.test(entry.name)) {
                jobs.push(entry.getFile().then(function (f) {
                  return f.text().then(function (t) {
                    return { name: f.name, text: t, mtime: f.lastModified };
                  });
                }));
              }
            }
            return Promise.all(jobs);
          })();
        });
      }

      var out = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS + 'note:') === 0) {
          var name = k.slice((LS + 'note:').length);
          out.push({
            name: name,
            text: localStorage.getItem(k) || '',
            mtime: Number(localStorage.getItem(LS + 'mtime:' + name)) || 0
          });
        }
      }
      return Promise.resolve(out);
    },

    readNote: function (name) {
      var self = this;
      if (self.mode === 'github') {
        return self.api(self.contentsPath(NOTES_DIR + '/' + name, true)).then(function (meta) {
            self.shas[NOTES_DIR + '/' + name] = meta.sha;
            return decodeText(meta.content);
          });
      }
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name); })
          .then(function (fh) { return fh.getFile(); })
          .then(function (f) { return f.text(); });
      }
      var v = localStorage.getItem(LS + 'note:' + name);
      return v === null ? Promise.reject(new Error('Not found: ' + name)) : Promise.resolve(v);
    },

    writeNote: function (name, text, opts) {
      var self = this;
      if (self.mode === 'github') {
        return self.ghPut(NOTES_DIR + '/' + name, encodeText(text), 'Update', name, opts).then(function () { });
      }
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name, { create: true }); })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) { return w.write(text).then(function () { return w.close(); }); });
      }
      try {
        localStorage.setItem(LS + 'note:' + name, text);
        localStorage.setItem(LS + 'mtime:' + name, String(Date.now()));
      } catch (e) {
        return Promise.reject(new Error('Browser storage is full. Connect GitHub or a folder.'));
      }
      return Promise.resolve();
    },

    deleteNote: function (name) {
      var self = this;
      if (self.mode === 'github') {
        var path = NOTES_DIR + '/' + name;
        return serial(function () {
          return self.api(self.contentsPath(path, true))
            .then(function (meta) {
              return self.api(self.contentsPath(path, false), {
                method: 'DELETE',
                body: {
                  message: self.commitMessage('Delete', name),
                  sha: meta.sha,
                  branch: self.github.branch
                }
              });
            }).then(function () { delete self.shas[path]; });
        });
      }
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.removeEntry(name); });
      }
      localStorage.removeItem(LS + 'note:' + name);
      localStorage.removeItem(LS + 'mtime:' + name);
      return Promise.resolve();
    },

    renameNote: function (from, to) {
      var self = this;
      if (from === to) return Promise.resolve(to);
      return self.readNote(from)
        .then(function (text) { return self.writeNote(to, text); })
        .then(function () { return self.deleteNote(from); })
        .then(function () { return to; });
    },

    /* ---------- assets ----------------------------------------------- */

    saveImage: function (blob, hint) {
      var self = this;
      var ext = extFromType(blob.type);
      var base = (hint || 'image').replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'image';
      var name = base + '-' + stamp() + '-' + Math.floor(Math.random() * 1e4) + '.' + ext;

      if (self.mode === 'github') {
        return encodeBlob(blob).then(function (b64) {
          return self.ghPut(ASSETS_DIR + '/' + name, b64, 'Add', name);
        }).then(function () { return '../' + ASSETS_DIR + '/' + name; });
      }
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(ASSETS_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name, { create: true }); })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) { return w.write(blob).then(function () { return w.close(); }); })
          .then(function () { return '../' + ASSETS_DIR + '/' + name; });
      }
      return readBlobAsDataURL(blob);
    },

    resolveAsset: function (path) {
      var self = this;
      var clean = String(path).replace(/^\.\//, '').replace(/^\.\.\//, '');
      if (self.assetURLs[clean]) return Promise.resolve(self.assetURLs[clean]);

      if (self.mode === 'github') {
        return self.api(self.contentsPath(clean, true), { allow404: true }).then(function (meta) {
            if (!meta || !meta.download_url) return null;
            var url = bustCache(meta.download_url, meta.sha);
            self.assetURLs[clean] = url;
            return url;
          }).catch(function () { return null; });
      }
      if (self.mode !== 'fs') return Promise.resolve(null);

      var parts = clean.split('/').filter(Boolean);
      if (!parts.length) return Promise.resolve(null);
      var dirP = Promise.resolve(self.root);
      for (var i = 0; i < parts.length - 1; i++) {
        (function (seg) { dirP = dirP.then(function (d) { return d.getDirectoryHandle(seg); }); })(parts[i]);
      }
      return dirP
        .then(function (d) { return d.getFileHandle(parts[parts.length - 1]); })
        .then(function (fh) { return fh.getFile(); })
        .then(function (f) {
          var url = URL.createObjectURL(f);
          self.assetURLs[clean] = url;
          return url;
        })
        .catch(function () { return null; });
    },

    /* ---------- tags.xml --------------------------------------------- */

    readTagsXML: function () {
      var self = this;
      if (self.mode === 'github') {
        return self.api(self.contentsPath(TAGS_FILE, true), { allow404: true }).then(function (meta) {
            if (!meta) return null;
            self.shas[TAGS_FILE] = meta.sha;
            return decodeText(meta.content);
          }).catch(function () { return null; });
      }
      if (self.mode === 'fs') {
        return self.root.getFileHandle(TAGS_FILE, { create: false })
          .then(function (fh) { return fh.getFile(); })
          .then(function (f) { return f.text(); })
          .catch(function () { return null; });
      }
      return Promise.resolve(localStorage.getItem(LS + TAGS_FILE));
    },

    writeTagsXML: function (xml) {
      var self = this;
      if (self.mode === 'github') {
        /* the hashtag graph is rewritten from the whole note set on every
           change, so the newest write is always the complete one */
        return self.ghPut(TAGS_FILE, encodeText(xml), 'Update', TAGS_FILE, { force: true }).then(function () { });
      }
      if (self.mode === 'fs') {
        return self.root.getFileHandle(TAGS_FILE, { create: true })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) { return w.write(xml).then(function () { return w.close(); }); });
      }
      try { localStorage.setItem(LS + TAGS_FILE, xml); } catch (e) { }
      return Promise.resolve();
    },

    /* ---------- misc -------------------------------------------------- */

    /* How long to sit on an edit before writing. A commit per keystroke
       would be absurd, so GitHub gets a much longer leash. */
    autosaveDelay: function () {
      return this.mode === 'github' ? 4000 : 900;
    },

    setting: function (key, val) {
      if (arguments.length === 1) return localStorage.getItem(LS + 'set:' + key);
      if (val === null) localStorage.removeItem(LS + 'set:' + key);
      else localStorage.setItem(LS + 'set:' + key, val);
      return val;
    }
  };

  global.Store = Store;
})(window);
