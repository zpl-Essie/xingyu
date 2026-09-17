/* 星语 · IndexedDB */
(function (w) {
  'use strict';

  var DB_NAME = 'tree-hole-sd';
  var DB_VER  = 1;
  var STORE   = 'records';

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var s = db.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('by_created', 'createdAt', { unique: false });
          s.createIndex('by_archived', 'archived', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  function tx(db, mode) { return db.transaction(STORE, mode).objectStore(STORE); }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function getUserId() {
    var uid = localStorage.getItem('th_sd_user');
    if (!uid) {
      uid = w.TreeHoleData.genUserId();
      localStorage.setItem('th_sd_user', uid);
    }
    return uid;
  }

  function addRecord(data) {
    return openDB().then(function (db) {
      var rec = {
        id: genId(),
        userId: getUserId(),
        text: data.text || '',
        mood: data.mood || 'calm',
        tag: data.tag || 'daily',
        images: data.images || [],
        voiceUrl: data.voiceUrl || '',
        voiceDuration: data.voiceDuration || 0,
        createdAt: Date.now(), updatedAt: Date.now(),
        archived: false, deleted: false
      };
      return new Promise(function (resolve, reject) {
        var r = tx(db, 'readwrite').add(rec);
        r.onsuccess = function () { resolve(rec); };
        r.onerror   = function () { reject(r.error); };
      });
    });
  }

  function updateRecord(id, patch) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var s = tx(db, 'readwrite');
        var gr = s.get(id);
        gr.onsuccess = function () {
          var rec = gr.result;
          if (!rec) return reject(new Error('not found'));
          for (var k in patch) rec[k] = patch[k];
          rec.updatedAt = Date.now();
          var wr = s.put(rec);
          wr.onsuccess = function () { resolve(rec); };
          wr.onerror   = function () { reject(wr.error); };
        };
        gr.onerror = function () { reject(gr.error); };
      });
    });
  }

  function softDelete(id) { return updateRecord(id, { deleted: true }); }
  function toggleArchive(id, archived) { return updateRecord(id, { archived: !!archived }); }

  function listRecords(filter) {
    filter = filter || {};
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var s = tx(db, 'readonly');
        var all = [];
        s.openCursor().onsuccess = function (e) {
          var cur = e.target.result;
          if (!cur) {
            var list = all.filter(function (r) {
              if (filter.onlyArchived && !r.archived) return false;
              if (filter.excludeDeleted !== false && r.deleted) return false;
              if (filter.includeArchived) return true;
              if (r.archived) return false;
              return true;
            });
            list.sort(function (a, b) { return b.createdAt - a.createdAt; });
            resolve(list);
            return;
          }
          all.push(cur.value);
          cur.continue();
        };
        s.onerror = function () { reject(s.error); };
      });
    });
  }

  function exportAll() {
    return listRecords({ includeArchived: true }).then(function (list) {
      return JSON.stringify({
        version: 1, exportedAt: Date.now(), userId: getUserId(), records: list
      }, null, 2);
    });
  }

  function importAll(jsonStr) {
    var data = JSON.parse(jsonStr);
    if (!data.records || !Array.isArray(data.records)) throw new Error('格式不对');
    return openDB().then(function (db) {
      return Promise.all(data.records.map(function (rec) {
        return new Promise(function (resolve, reject) {
          var s = tx(db, 'readwrite');
          var r = s.put(rec);
          r.onsuccess = function () { resolve(); };
          r.onerror   = function () { reject(r.error); };
        });
      }));
    });
  }

  w.TreeHoleDB = {
    addRecord: addRecord, updateRecord: updateRecord,
    softDelete: softDelete, toggleArchive: toggleArchive,
    listRecords: listRecords,
    exportAll: exportAll, importAll: importAll,
    getUserId: getUserId
  };
})(window);
