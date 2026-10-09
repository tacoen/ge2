// js/ge2/store.js — localStorage that cannot throw.
//
// Every access is guarded. Reading or writing localStorage raises in a
// private window, with site data blocked, and in some sandboxed frames —
// and an unguarded call takes the caller's whole try block with it. Here a
// failure degrades to the fallback, so a page that cannot remember things
// still works.
//
//   import { store } from './ge2/store.js';
//   store.get('theme');              // -> string | null
//   store.set('theme', 'dark');      // -> true when it stuck
//   store.getJSON('buckets', {});    // parsed, or the fallback
//   store.setJSON('buckets', data);

const safe = (fn, fallback) => {
  try { return fn(); } catch { return fallback; }
};

export const store = {
  /** Is storage usable at all? Probes once per call — cheap and honest. */
  get available() {
    return safe(() => {
      const k = '__ge2_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    }, false);
  },

  get: (key, fallback = null) => safe(() => localStorage.getItem(key) ?? fallback, fallback),
  set: (key, value) => safe(() => { localStorage.setItem(key, String(value)); return true; }, false),
  remove: (key) => safe(() => { localStorage.removeItem(key); return true; }, false),

  /** Parsed JSON, or the fallback — corrupt content is not an exception. */
  getJSON(key, fallback = null) {
    const raw = store.get(key);
    if (raw === null) return fallback;
    return safe(() => JSON.parse(raw) ?? fallback, fallback);
  },

  setJSON: (key, value) => safe(() => store.set(key, JSON.stringify(value)), false),
};

export default store;
