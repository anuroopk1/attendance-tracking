/* ============================================================
   STORE — Offline-first IndexedDB layer + session cache
   ============================================================ */

const Store = (() => {
  const DB_NAME    = 'AttendanceDB';
  const DB_VERSION = 2;
  let _db = null;

  // ── IndexedDB init ────────────────────────────────────────
  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_sync')) {
          db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('batches')) {
          db.createObjectStore('batches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('students')) {
          db.createObjectStore('students', { keyPath: 'id' });
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  function tx(storeName, mode = 'readonly') {
    return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
  }

  // ── Generic put/get ───────────────────────────────────────
  async function put(storeName, data) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const req = store.put(data);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function get(storeName, key) {
    const store = await tx(storeName);
    return new Promise((res, rej) => {
      const req = store.get(key);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function getAll(storeName) {
    const store = await tx(storeName);
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function remove(storeName, key) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((res, rej) => {
      const req = store.delete(key);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  // ── Backend Cache Synchronization ─────────────────────────
  async function fetchAndCacheData() {
    if (!navigator.onLine) {
      console.warn('[Store] Offline: Skipping remote dataset caching.');
      return;
    }
    console.info('[Store] Fetching fresh datasets from API...');

    // 1. Fetch & Cache Batches
    const batches = await window.AppAPI.fetch('/api/batches');
    const batchStore = await tx('batches', 'readwrite');
    await new Promise((res) => { batchStore.clear().onsuccess = res; });
    for (const b of batches) {
      await put('batches', b);
    }

    // 2. Fetch & Cache Students
    const students = await window.AppAPI.fetch('/api/students');
    const studentStore = await tx('students', 'readwrite');
    await new Promise((res) => { studentStore.clear().onsuccess = res; });
    for (const s of students) {
      await put('students', s);
    }

    // 3. Fetch & Cache Recent Attendance Logs
    try {
      const logs = await window.AppAPI.fetch('/api/attendance');
      const attStore = await tx('attendance', 'readwrite');
      await new Promise((res) => { attStore.clear().onsuccess = res; });
      for (const log of logs) {
        const recordId = `${log.batchId}_${log.date}_${log.studentId}`;
        await put('attendance', {
          id: recordId,
          batchId: log.batchId,
          date: log.date,
          studentId: log.studentId,
          status: log.status,
          markedBy: log.markedBy,
          markedAt: log.markedAt
        });
      }
    } catch (e) {
      console.warn('[Store] Could not cache recent attendance:', e.message);
    }

    console.info('[Store] IndexedDB local database cache populated.');
  }

  // ── Attendance specific ───────────────────────────────────
  async function saveAttendanceRecord(record) {
    const id  = `${record.batchId}_${record.date}_${record.studentId}`;
    await put('attendance', { ...record, id });
    
    if (navigator.onLine) {
      try {
        await window.AppAPI.fetch('/api/attendance/sync', {
          method: 'POST',
          body: JSON.stringify({
            records: [{
              batchId: record.batchId,
              date: record.date,
              studentId: record.studentId,
              status: record.status,
              markedAt: new Date().toISOString()
            }]
          })
        });
        return;
      } catch (err) {
        console.warn('[Store] Online direct sync failed, queueing offline:', err);
      }
    }
    
    await put('pending_sync', { ...record, id: undefined, queuedAt: Date.now() });
  }

  async function saveAttendanceBatch(records) {
    return Promise.all(records.map(saveAttendanceRecord));
  }

  async function getAttendanceRecord(batchId, date, studentId) {
    const id = `${batchId}_${date}_${studentId}`;
    return get('attendance', id);
  }

  async function getAllPending() {
    return getAll('pending_sync');
  }

  async function clearPending(id) {
    return remove('pending_sync', id);
  }

  // ── Cache helper ──────────────────────────────────────────
  async function setCache(key, value, ttlMs = 300_000) {
    await put('cache', { key, value, expiresAt: Date.now() + ttlMs });
  }

  async function getCache(key) {
    const entry = await get('cache', key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { await remove('cache', key); return null; }
    return entry.value;
  }

  // ── Online sync ───────────────────────────────────────────
  async function syncPending() {
    if (!navigator.onLine || !window.AppAPI?.token) return;
    const pending = await getAllPending();
    if (pending.length === 0) return;

    console.info(`[Store] Synchronizing ${pending.length} pending offline records...`);
    const recordsToSync = pending.map(p => ({
      batchId: p.batchId,
      date: p.date,
      studentId: p.studentId,
      status: p.status,
      markedAt: new Date(p.queuedAt || Date.now()).toISOString()
    }));

    try {
      await window.AppAPI.fetch('/api/attendance/sync', {
        method: 'POST',
        body: JSON.stringify({ records: recordsToSync })
      });

      for (const p of pending) {
        await clearPending(p.id);
      }
      console.info('[Store] Synchronized pending attendance logs.');
    } catch (err) {
      console.warn('[Store] Bulk synchronization failed:', err);
    }
  }

  window.addEventListener('online', () => {
    syncPending();
    Utils?.toast('Back online — syncing attendance...', { icon: '🔄', duration: 2000 });
  });
  window.addEventListener('offline', () => {
    Utils?.toast('Offline — attendance will sync when reconnected', { icon: '📵', duration: 3000 });
  });

  return {
    saveAttendanceRecord, saveAttendanceBatch,
    getAttendanceRecord, getAllPending, clearPending,
    setCache, getCache, syncPending, fetchAndCacheData,
    openDB, tx, getAll, get, put
  };
})();

window.Store = Store;
