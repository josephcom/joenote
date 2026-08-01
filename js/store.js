/* JoeNote - js/store.js
 * Persistence. Two backends:
 *   fs     - File System Access API pointed at a real folder (your git clone
 *            of the joenote repo). Notes are real notes/*.md files, pasted
 *            images become real assets/*.png files.
 *   local  - localStorage fallback for browsers without the FS API.
 *            Images are embedded as data: URIs so notes stay self-contained.
 */
(function (global) {
  'use strict';

  var NOTES_DIR = 'notes';
  var ASSETS_DIR = 'assets';
  var TAGS_FILE = 'tags.xml';
  var LS_PREFIX = 'joenote:';
  var IDB_NAME = 'joenote';
  var IDB_STORE = 'handles';

  /* ---------------- IndexedDB (only used to remember the folder) ------ */

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

  /* ---------------- helpers ------------------------------------------ */

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
      'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg',
      'image/bmp': 'bmp'
    };
    return map[type] || 'png';
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  /* ---------------- Store -------------------------------------------- */

  var Store = {
    mode: 'local',
    root: null,          /* FileSystemDirectoryHandle */
    folderName: null,
    assetURLs: Object.create(null),

    supportsFS: typeof global.showDirectoryPicker === 'function',

    /* Try to silently re-open the folder used last time. */
    init: function () {
      var self = this;
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

    connect: function () {
      var self = this;
      if (!self.supportsFS) {
        return Promise.reject(new Error(
          'This browser has no File System Access API. Notes stay in this browser (localStorage). ' +
          'Use Chrome or Edge to keep them as real .md files in a folder.'));
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
      this.mode = 'local';
      return idbSet('root', null);
    },

    ensureLayout: function () {
      var self = this;
      if (self.mode !== 'fs') return Promise.resolve();
      return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
        .then(function () { return self.root.getDirectoryHandle(ASSETS_DIR, { create: true }); })
        .then(function () { });
    },

    /* ------------- notes ------------- */

    listNotes: function () {
      var self = this;
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
        if (k && k.indexOf(LS_PREFIX + 'note:') === 0) {
          var name = k.slice((LS_PREFIX + 'note:').length);
          var raw = localStorage.getItem(k) || '';
          out.push({ name: name, text: raw, mtime: Number(localStorage.getItem(LS_PREFIX + 'mtime:' + name)) || 0 });
        }
      }
      return Promise.resolve(out);
    },

    readNote: function (name) {
      var self = this;
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name); })
          .then(function (fh) { return fh.getFile(); })
          .then(function (f) { return f.text(); });
      }
      var v = localStorage.getItem(LS_PREFIX + 'note:' + name);
      return v === null ? Promise.reject(new Error('Not found: ' + name)) : Promise.resolve(v);
    },

    writeNote: function (name, text) {
      var self = this;
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name, { create: true }); })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) { return w.write(text).then(function () { return w.close(); }); });
      }
      try {
        localStorage.setItem(LS_PREFIX + 'note:' + name, text);
        localStorage.setItem(LS_PREFIX + 'mtime:' + name, String(Date.now()));
      } catch (e) {
        return Promise.reject(new Error('Browser storage is full. Connect a folder to keep notes as files.'));
      }
      return Promise.resolve();
    },

    deleteNote: function (name) {
      var self = this;
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.removeEntry(name); });
      }
      localStorage.removeItem(LS_PREFIX + 'note:' + name);
      localStorage.removeItem(LS_PREFIX + 'mtime:' + name);
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

    exists: function (name) {
      var self = this;
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(NOTES_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name); })
          .then(function () { return true; }, function () { return false; });
      }
      return Promise.resolve(localStorage.getItem(LS_PREFIX + 'note:' + name) !== null);
    },

    /* ------------- assets ------------- */

    /* Returns the markdown-ready src for a pasted image. */
    saveImage: function (blob, hint) {
      var self = this;
      var ext = extFromType(blob.type);
      var base = (hint || 'image').replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'image';
      var name = base + '-' + stamp() + '-' + Math.floor(Math.random() * 1e4) + '.' + ext;
      if (self.mode === 'fs') {
        return self.root.getDirectoryHandle(ASSETS_DIR, { create: true })
          .then(function (dir) { return dir.getFileHandle(name, { create: true }); })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) { return w.write(blob).then(function () { return w.close(); }); })
          .then(function () { return '../' + ASSETS_DIR + '/' + name; });
      }
      return readBlobAsDataURL(blob);
    },

    /* Resolve a relative image path from a note to something the <img> can use. */
    resolveAsset: function (path) {
      var self = this;
      if (self.mode !== 'fs') return Promise.resolve(null);
      var clean = String(path).replace(/^\.\//, '').replace(/^\.\.\//, '');
      var parts = clean.split('/').filter(Boolean);
      if (!parts.length) return Promise.resolve(null);
      var cacheKey = parts.join('/');
      if (self.assetURLs[cacheKey]) return Promise.resolve(self.assetURLs[cacheKey]);
      var dirP = Promise.resolve(self.root);
      for (var i = 0; i < parts.length - 1; i++) {
        (function (seg) {
          dirP = dirP.then(function (d) { return d.getDirectoryHandle(seg); });
        })(parts[i]);
      }
      return dirP
        .then(function (d) { return d.getFileHandle(parts[parts.length - 1]); })
        .then(function (fh) { return fh.getFile(); })
        .then(function (f) {
          var url = URL.createObjectURL(f);
          self.assetURLs[cacheKey] = url;
          return url;
        })
        .catch(function () { return null; });
    },

    /* ------------- tags.xml ------------- */

    readTagsXML: function () {
      var self = this;
      if (self.mode === 'fs') {
        return self.root.getFileHandle(TAGS_FILE, { create: false })
          .then(function (fh) { return fh.getFile(); })
          .then(function (f) { return f.text(); })
          .catch(function () { return null; });
      }
      return Promise.resolve(localStorage.getItem(LS_PREFIX + TAGS_FILE));
    },

    writeTagsXML: function (xml) {
      var self = this;
      if (self.mode === 'fs') {
        return self.root.getFileHandle(TAGS_FILE, { create: true })
          .then(function (fh) { return fh.createWritable(); })
          .then(function (w) { return w.write(xml).then(function () { return w.close(); }); });
      }
      try { localStorage.setItem(LS_PREFIX + TAGS_FILE, xml); } catch (e) { }
      return Promise.resolve();
    },

    /* ------------- misc ------------- */

    setting: function (key, val) {
      if (arguments.length === 1) return localStorage.getItem(LS_PREFIX + 'set:' + key);
      if (val === null) localStorage.removeItem(LS_PREFIX + 'set:' + key);
      else localStorage.setItem(LS_PREFIX + 'set:' + key, val);
      return val;
    }
  };

  global.Store = Store;
})(window);
