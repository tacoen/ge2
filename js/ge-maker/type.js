// js/ge-maker/type.js — the Theme page's typography section (type controls
// and the per-element table) and buckets. Imported by theme.js. It edits the
// same overrides (js/ge-maker/overrides.js) as the colour editor, so the
// buckets and the vars-overrides.css export carry both.
import { ui } from '../ge2/ui.js';
import { store } from '../ge2/store.js';
import { out } from './util.js';
import { mountTypography, TYPO_TOKENS } from './typography.js';
import * as ov from './overrides.js';

const root = document.documentElement;

const { persist, KEEP } = ov;

const bucketCss = ui.el('#bucketCss');
ui.copy(ui.el('#bucketCopy'), bucketCss);
function showCss() {
  if (bucketCss) bucketCss.textContent = ov.overridesCss().trim() || '/* no overrides */';
}

// Re-read the controls from <html> after a load, a clear or a theme switch.
function syncControls() {
  const style = root.style;
  rootSize.value = parseInt(style.fontSize || '16', 10) || 16;
  out('rootSizeVal', `${rootSize.value}px`);
  leading.value = style.getPropertyValue('--leading').trim() || 1.5;
  out('leadingVal', String(leading.value));
  syncTypography();
}

function refreshBuckets(selected) {
  const names = Object.keys(store.getJSON(KEEP, {})).sort();
  bucketList.innerHTML = names.length
    ? names.map((n) => `<option value="${n}">${n}</option>`).join('')
    : '<option value="">(none saved)</option>';
  if (selected) bucketList.value = selected;
  out('bucketOut', `${names.length} bucket${names.length === 1 ? '' : 's'} saved`);
}

const bucketName = ui.el('#bucketName');
const bucketList = ui.el('#bucketList');

ui.on(ui.el('#bucketSave'), 'click', () => {
  const name = bucketName.value.trim();
  if (!name) { ui.toast('Name the bucket first', 'warning', 1500); return; }
  persist();
  const all = store.getJSON(KEEP, {});
  all[name] = structuredClone(ov.getState());
  store.setJSON(KEEP, all);
  refreshBuckets(name);
  ui.toast(`Saved "${name}"`, 'success', 1500);
});

ui.on(ui.el('#bucketLoad'), 'click', () => {
  const name = bucketList.value;
  const values = store.getJSON(KEEP, {})[name];
  if (!values) { ui.toast('Nothing to load', 'warning', 1500); return; }
  ov.replace(values);
  ui.toast(`Loaded "${name}"`, 'success', 1500);
});

ui.on(ui.el('#bucketDelete'), 'click', () => {
  const name = bucketList.value;
  const all = store.getJSON(KEEP, {});
  if (!(name in all)) { ui.toast('Nothing to delete', 'warning', 1500); return; }
  delete all[name];
  store.setJSON(KEEP, all);
  refreshBuckets();
  ui.toast(`Deleted "${name}"`, 'info', 1500);
});

ui.on(ui.el('#bucketClear'), 'click', () => {
  ov.replace(ov.empty());
  ui.toast('Back to the stylesheet values, both themes', 'info', 1800);
});

ui.on(ui.el('#varsDownload'), 'click', () => {
  persist();
  const n = ov.download();
  if (!n) { ui.toast('No overrides to export', 'warning', 1800); return; }
  const state = ov.getState();
  const per = ov.THEMES.filter((t) => Object.keys(state[t] ?? {}).length);
  out('bucketOut', `exported ${n} override${n === 1 ? '' : 's'}`
    + (per.length ? ` (${per.join(' + ')})` : ''));
});

const rootSize = ui.el('#rootSize');
ui.on(rootSize, 'input', () => {
  root.style.fontSize = `${rootSize.value}px`;
  out('rootSizeVal', `${rootSize.value}px`);
  persist();
});

const leading = ui.el('#leading');
ui.on(leading, 'input', () => {
  root.style.setProperty('--leading', leading.value);
  out('leadingVal', leading.value);
  persist();
});

// Element typography — global tokens, so they land in state.global and the
// :root block of the export, like --leading. The body row's font is the
// page font: there is no separate --font-sans picker.
const syncTypography = mountTypography(ui.el('#typoEditors'), persist);
// One section, one reset: the root size and --leading above the table go
// too, and a --font-sans override left by the old picker.
ui.on(ui.el('#typoReset'), 'click', () => {
  for (const name of TYPO_TOKENS) root.style.removeProperty(name);
  root.style.fontSize = '';
  root.style.removeProperty('--leading');
  root.style.removeProperty('--font-sans');
  syncControls();
  persist();
  ui.toast('Typography back to the stylesheet', 'info', 1500);
});

ov.onChange(() => { syncControls(); showCss(); });
syncControls();
showCss();
refreshBuckets();
