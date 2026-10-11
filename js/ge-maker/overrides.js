// js/ge-maker/overrides.js — the token overrides every demo page shares.
//
// One state, kept in localStorage: { global, light, dark }, each a map of
// custom property → value. It is applied inline on <html> on every demo page,
// so a colour or a font set on the Theme page shows
// everywhere, and the sidebar's theme button swaps the per-theme part in.
// The Theme page's buckets and vars-overrides.css export read the same state.
//
// Pages change a token with set(); anything else that writes inline on <html>
// (the Theme page's type controls) calls persist() afterwards, which reads
// the inline styles back into the state.

import { ui } from '../ge2/ui.js';
import { store } from '../ge2/store.js';
import { tokenValue } from './util.js';

export const LIVE = 'ge2-test:tokens';
export const KEEP = 'ge2-test:buckets';
export const THEMES = ['light', 'dark'];

// What vars.css declares inside a [data-theme] block — kept per theme. Every
// other token is theme-neutral and lands in `global`.
export const THEMED = new Set([
  '--bg', '--fg', '--gray', '--tone-fg',
  '--seed-ac', '--seed-pr', '--seed-sc', '--seed-da', '--seed-wr', '--seed-in',
]);

export const themeNow = () => (ui.getTheme() === 'dark' ? 'dark' : 'light');

const root = document.documentElement;
export const empty = () => ({ global: {}, light: {}, dark: {} });

// Older saves were one flat map, or put themed tokens in `global`.
export function migrate(raw) {
  const s = empty();
  if (!raw || typeof raw !== 'object') return s;
  if (raw.global || raw.light || raw.dark) {
    for (const k of ['global', ...THEMES]) Object.assign(s[k], raw[k] ?? {});
    for (const [prop, value] of Object.entries(s.global)) {
      if (!THEMED.has(prop)) continue;
      for (const t of THEMES) s[t][prop] ??= value;
      delete s.global[prop];
    }
    return s;
  }
  for (const [prop, value] of Object.entries(raw)) {
    (THEMED.has(prop) ? s[themeNow()] : s.global)[prop] = value;
  }
  return s;
}

let state = migrate(store.getJSON(LIVE, null));

// The Theme page (then "UI theme") once kept its own panel-only overrides —
// { 'ac-light': …, 'seed-pr-dark': … }. Move them over once, without
// replacing anything already set here.
const OLD = 'ge2-test:ui-theme';
const old = store.getJSON(OLD, null);
if (old) {
  for (const [key, value] of Object.entries(old)) {
    const m = /^(ac|bg|fg|seed-(?:pr|wr|da|sc|in))-(light|dark)$/.exec(key);
    if (m && value) state[m[2]][m[1] === 'ac' ? '--seed-ac' : `--${m[1]}`] ??= value;
  }
  store.setJSON(LIVE, state);
  store.remove(OLD);
}
export const getState = () => state;

const listeners = new Set();
/** Run fn after every change: an edit, a load, a theme switch. */
export const onChange = (fn) => listeners.add(fn);
const changed = () => listeners.forEach((fn) => fn(state));

/** The stylesheet's own value for the current theme, ignoring any override. */
export function sheetValue(name) {
  const inline = root.style.getPropertyValue(name);
  if (inline) root.style.removeProperty(name);
  const v = tokenValue(name);
  if (inline) root.style.setProperty(name, inline);
  return v;
}

/** The override for the current theme, or '' when there is none. */
export const override = (name) => root.style.getPropertyValue(name).trim();

/** Put the state on <html>: global, then the current theme's part. */
export function apply() {
  for (let i = root.style.length - 1; i >= 0; i--) {
    const prop = root.style[i];
    if (prop.startsWith('--')) root.style.removeProperty(prop);
  }
  root.style.fontSize = '';
  for (const [prop, value] of Object.entries({ ...state.global, ...state[themeNow()] })) {
    if (prop === 'font-size') root.style.fontSize = value;
    else root.style.setProperty(prop, value);
  }
}

/** Read <html>'s inline styles back into the state and save it. */
export function persist() {
  const global = {}, themed = {};
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (!prop.startsWith('--')) continue;
    (THEMED.has(prop) ? themed : global)[prop] = root.style.getPropertyValue(prop).trim();
  }
  if (root.style.fontSize) global['font-size'] = root.style.fontSize;
  state.global = global;
  state[themeNow()] = themed;
  store.setJSON(LIVE, state);
  changed();
}

/** Override one token ('' or the stylesheet's own value clears it). */
export function set(name, value) {
  const v = String(value ?? '').trim();
  if (v && v.toLowerCase() !== sheetValue(name).toLowerCase()) root.style.setProperty(name, v);
  else root.style.removeProperty(name);
  persist();
}

/** Replace the whole state — a bucket load, or clear with empty(). */
export function replace(next) {
  state = migrate(next);
  store.setJSON(LIVE, state);
  apply();
  changed();
}

/** Drop the given tokens' overrides, in both themes. */
export function clear(names) {
  for (const name of names) {
    root.style.removeProperty(name);
    for (const k of ['global', ...THEMES]) delete state[k][name];
  }
  store.setJSON(LIVE, state);
  changed();
}

export const count = () =>
  ['global', ...THEMES].reduce((n, k) => n + Object.keys(state[k] ?? {}).length, 0);

/** The override blocks — the preview, and the body of vars-overrides.css. */
export function overridesCss() {
  const block = (sel, obj) => {
    const list = Object.entries(obj ?? {});
    return list.length
      ? `\n${sel} {\n${list.map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}\n` : '';
  };
  return block(':root', state.global)
    + THEMES.map((t) => block(`:root[data-theme='${t}']`, state[t])).join('');
}

/** Download the overrides as css/vars-overrides.css; returns how many. */
export function download() {
  const n = count();
  if (!n) return 0;
  const stamp = new Date().toISOString().slice(0, 10);
  const css = `/* css/vars-overrides.css — exported from the ge demo, ${stamp}.
   Changed values only; everything else falls back to vars.css.
   style.css imports it into layer(units) right after vars.css, so it wins.
   The :root block holds what vars.css declares outside a theme; the
   [data-theme] blocks hold the rest, so switching keeps working. */
${overridesCss()}`;
  const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vars-overrides.css';
  a.click();
  URL.revokeObjectURL(url);
  return n;
}

/** Switch theme without losing overrides: save this theme's, swap in the next. */
export function switchTheme(change) {
  persist();
  change();
  apply();
  changed();
}

// The sidebar's theme button, on every page.
ui.on(document, 'ge-maker:theme', (e) => {
  e.preventDefault();
  switchTheme(() => ui.toggleTheme());
});

apply();
