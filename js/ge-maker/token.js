// js/ge-maker/token.js — theme switch, token playground and buckets.
import { ui } from '../ge2/ui.js';
import { store } from '../ge2/store.js';
import { out, tokenValue } from './util.js';
import { mountTypography, TYPO_TOKENS } from './typography.js';

const showTheme = () => out('themeOut', `data-theme = ${ui.getTheme()}`);

function switchTheme(change) {
  persist();
  change();
  showTheme();
  refreshBases();
  applyState();
}

ui.on(ui.el('#themeLight'),  'click', () => switchTheme(() => ui.setTheme('light')));
ui.on(ui.el('#themeDark'),   'click', () => switchTheme(() => ui.setTheme('dark')));
ui.on(ui.el('#themeToggle'), 'click', () => switchTheme(() => ui.toggleTheme()));
showTheme();

const THEMES = ['light', 'dark'];
const THEMED = new Set([
  '--bg', '--fg', '--gray', '--seed-ac',
  '--seed-pr', '--seed-sc', '--seed-da', '--seed-wr',
]);
const themeNow = () => (ui.getTheme() === 'dark' ? 'dark' : 'light');

const root = document.documentElement;

// Two columns: left the neutrals the surfaces are built from, right the five
// hues every system colour is mixed from. The grid is one table that fills
// row-major, two tokens per row, so the flat list interleaves the columns.
const COL_BASE = [
  ['--bg', 'page background'],
  ['--fg', 'foreground text'],
  ['--gray', 'drives the fg ramp'],
  ['--white', 'mix target: subtle / borders'],
  ['--black', 'mix target: inset / overlay'],
];
const COL_SEED = [
  ['--seed-ac', 'accent'],
  ['--seed-pr', 'primary'],
  ['--seed-sc', 'success'],
  ['--seed-da', 'danger'],
  ['--seed-wr', 'warning'],
];
const SEEDS = COL_BASE.flatMap((row, i) => (COL_SEED[i] ? [row, COL_SEED[i]] : [row]));

const DERIVED = [
  { section: 'interface', rows: [
    { label: 'bg',       tokens: ['--bg', '--bg-muted', '--bg-inset', '--bg-subtle'] },
    { label: 'fg',       tokens: ['--subtle', '--muted', '--fg'] },
    { label: 'border',   tokens: ['--border-muted', '--border', '--border-hover'] },
    { label: 'shadow',   tokens: ['--shadow'] },
    { label: 'overlay',  tokens: ['--bg-overlay'] },
  ] },
  { section: 'system', rows: [
    { label: 'sc',   tokens: ['--sc', '--sc-bg', '--sc-subtle', '--sc-border'] },
    { label: 'da',   tokens: ['--da', '--da-bg', '--da-subtle', '--da-border'] },
    { label: 'wr',   tokens: ['--wr', '--wr-bg', '--wr-subtle', '--wr-border'] },
    { label: 'pr',   tokens: ['--pr', '--pr-bg', '--pr-subtle', '--pr-border'] },
    { label: 'ac',   tokens: ['--ac', '--ac-bg', '--ac-subtle', '--ac-border'] },
  ] },
];

// ge2's toast types, by system-colour label. `accent` has no type in ui.css —
// css/ge-maker.css carries .toast-accent for the demo.
const TOAST_TYPE = { sc: 'success', da: 'error', wr: 'warning', pr: 'info', ac: 'accent' };

// The static `system` preview is trimmed to these two so it ends up about as
// tall as the .dp-alt pass below it, which still carries every row. Declared
// up here because the DERIVED loop calls preview() while this module runs.
const STATIC_ROWS = new Set(['pr', 'ac']);

const probe = document.createElement('span');
probe.style.display = 'none';
document.body.appendChild(probe);

function resolve(value) {
  probe.style.color = '';
  probe.style.color = value;
  return getComputedStyle(probe).color || 'rgb(0, 0, 0)';
}

function toHex(value) {
  const n = resolve(value).match(/[\d.]+/g);
  if (!n) return '#000000';
  return '#' + n.slice(0, 3).map((v) => Math.round(+v).toString(16).padStart(2, '0')).join('');
}

function sheetValue(name) {
  const inline = root.style.getPropertyValue(name);
  if (inline) root.style.removeProperty(name);
  const v = tokenValue(name);
  if (inline) root.style.setProperty(name, inline);
  return v;
}

const editors = ui.el('#colorEditors');
const inputs = new Map();

const describe = (value) => `${value} \u2192 ${resolve(value)}`;

const table = document.createElement('div');
table.className = 'token-grid';
table.setAttribute('role', 'table');
table.setAttribute('aria-label', 'Colour seed tokens');
const HEAD = '<span role="columnheader">token</span><span role="columnheader">CSS</span>'
  + '<span role="columnheader">override</span><span role="columnheader">note</span>';
const HEAD_DUP = HEAD.replace(/<span role="columnheader">/g,
  '<span class="dup" aria-hidden="true">');
table.innerHTML = `<div class="token-head" role="row">${HEAD}${HEAD_DUP}</div>`;
const tbody = table;
editors?.appendChild(table);

for (const [name, hint] of SEEDS) {
  const base = sheetValue(name);

  const tr = document.createElement('div');
  tr.className = 'token-row';
  tr.setAttribute('role', 'row');
  tr.innerHTML =
    `<span class="token-name" role="rowheader"><code>${name}</code></span>`
    + `<span class="token-base" role="cell">`
      + `<button type="button" class="swatch-preview swatch-copy"`
      + ` title="${describe(base)} (click to use)" aria-label="${name} stylesheet value, ${describe(base)}, click to use">`
      + `<span class="swatch-fill" style="background:${base}"></span></button></span>`
    + `<span class="token-control" role="cell">`
      + `<input type="color" class="swatch-pick" data-token="${name}" aria-label="Pick ${name}">`
      + `<input type="text" class="swatch-hex" data-token-text="${name}" spellcheck="false"`
      + ` autocomplete="off" placeholder="${base}" aria-label="${name} value">`
      + `<span class="swatch-preview" role="img"><span class="swatch-fill"></span></span>`
      + `<button type="button" class="swatch-reset" title="Reset ${name}" aria-label="Reset ${name}">`
      + `<span data-icon="refresh" data-icon-size="14"></span></button>`
    + `</span>`
    + `<span class="token-hint" role="cell">${hint}</span>`;
  tbody.appendChild(tr);

  const picker = tr.querySelector('.swatch-pick');
  const text = tr.querySelector('.swatch-hex');
  const live = tr.querySelector('.token-control .swatch-fill');
  const preview = tr.querySelector('.token-control .swatch-preview');
  const reset = tr.querySelector('.swatch-reset');
  inputs.set(name, { picker, text, base, live, preview, tr });

  const commit = (value) => {
    const v = String(value).trim();
    if (v) root.style.setProperty(name, v);
    else root.style.removeProperty(name);
    paint(name);
    paintDerived();
    persist();
  };

  ui.on(text, 'input', () => commit(text.value));
  ui.on(picker, 'input', () => { text.value = picker.value; commit(picker.value); });
  ui.on(reset, 'click', () => { text.value = ''; commit(''); });
  ui.on(tr.querySelector('.swatch-copy'), 'click', () => {
    const v = inputs.get(name).base;
    text.value = v;
    commit(v);
  });
}

function refreshBases() {
  for (const [name, rec] of inputs) {
    const base = sheetValue(name);
    rec.base = base;
    rec.text.placeholder = base;
    rec.tr.querySelector('.token-base .swatch-fill').style.background = base;
    const btn = rec.tr.querySelector('.swatch-copy');
    btn.title = `${describe(base)} (click to use)`;
    btn.setAttribute('aria-label', `${name} stylesheet value, ${describe(base)}, click to use`);
  }
}

function paint(name) {
  const { picker, base, live, preview, tr } = inputs.get(name);
  const override = root.style.getPropertyValue(name).trim();
  const effective = override || base;
  picker.value = toHex(effective);
  live.style.background = effective;
  preview.title = describe(effective);
  tr.classList.toggle('changed', Boolean(override));
}

const derivedHost = ui.el('#derivedSwatches');
const chips = [];

for (const { section, rows } of DERIVED) {
  const group = document.createElement('section');
  group.className = 'derived-group';
  const head = document.createElement('h4');
  head.className = 'sub-h4';
  head.textContent = section;
  group.appendChild(head);
  group.appendChild(preview(section, rows));
  derivedHost?.appendChild(group);

  for (const { label, tokens } of rows) {
    const row = document.createElement('div');
    row.className = 'derived-row';
    row.innerHTML = `<span class="derived-label mono">${label}</span>`
      + '<div class="derived-set"></div>';
    const set = row.querySelector('.derived-set');

    for (const name of tokens) {
      const cell = document.createElement('div');
      cell.className = 'swatch';
      cell.dataset.token = name;
      cell.style.background = `var(${name})`;
      set.appendChild(cell);
      chips.push({ name, chip: cell });
    }
    group.appendChild(row);
  }
}

// `system` gets a second pass in .dp-alt, the same rows as live controls.
function preview(section, rows) {
  if (section === 'system') {
    const frag = document.createDocumentFragment();
    frag.appendChild(previewBox(section, rows.filter(({ label }) => STATIC_ROWS.has(label))));
    frag.appendChild(previewBox(section, rows, 'dp-alt'));
    return frag;
  }
  return previewBox(section, rows);
}

function previewBox(section, rows, variant) {
  const box = document.createElement('div');
  box.className = variant ? `derived-preview ${variant}` : 'derived-preview';
  // The alt pass holds real buttons, so it is a group — role="img" would hide
  // them from assistive tech.
  const live = variant === 'dp-alt';
  box.setAttribute('role', live ? 'group' : 'img');
  box.setAttribute('aria-label', live
    ? `${section} tokens as buttons and toasts`
    : `${section} tokens in use`);

  if (section === 'system' && live) {
    box.innerHTML = rows.map(({ label: l }) => `
      <div class="pv-slin">
        <button type="button" class="pv-btn" data-toast="${l}"
          style="--c: var(--${l}-bg-text); --c-bg: var(--${l}-bg);
                 --c-border: var(--${l}-border)">${l} solid</button>
        <button type="button" class="pv-btn" data-toast="${l}"
          style="--c: var(--${l}); --c-bg: var(--${l}-subtle);
                 --c-border: var(--${l}-border)">${l} subtle</button>
        <div class="pv-msg">
          <span class="pv-dot" style="background: var(--${l})"></span>
          click either — a ${l} toast drops in bottom-right
        </div>
      </div>`).join('');

    ui.on(box, 'click', (event) => {
      const btn = event.target.closest('[data-toast]');
      if (!btn) return;
      const l = btn.dataset.toast;
      ui.toast(`${l} toast, raised by the ${l} button`, TOAST_TYPE[l] || 'info');
    });
  } else if (section === 'system') {
    box.innerHTML = rows.map(({ label: l }) => `
      <div class="pv-slin">
        <div class="pv-toast" style="--c: var(--${l}-bg-text);
             --c-bg: var(--${l}-bg); --c-border: var(--${l}-border)">${l}</div>
        <div class="pv-text" style="color: var(--${l})">${l} as text</div>
        <div class="pv-msg" style="--c: var(--${l}); --c-bg: var(--${l}-subtle);
             --c-border: var(--${l}-bg)">
          <span class="pv-dot"></span>${l} message, with text and icon
        </div>
      </div>`).join('');
  } else {
    const SURFACES = ['--bg-inset', '--bg', '--bg-muted', '--bg-subtle'];
    const sample = `Body text is fg, then <span class="pv-muted">muted</span>
      and <span class="pv-subtle">subtle</span>.`;

    box.innerHTML = `
      <div class="pv-card">
        <div class="pv-div">
          ${SURFACES.map((bg) => `
            <div class="pv-surface" style="background: var(${bg})">
              <p class="pv-body">${bg.slice(2)} - ${sample}</p>
            </div>`).join('')}
          <div class="pv-borders">
            <span class="pv-b1">border-muted</span>
            <span class="pv-b2">border</span>
            <span class="pv-b3">hover</span>
          </div>
        </div>
      </div>`;
  }
  return box;
}

function paintDerived() {
  for (const { name, chip } of chips) {
    chip.title = `${name} \u2192 ${getComputedStyle(chip).backgroundColor}`;
  }
}

function syncSeeds() {
  for (const [name, { text }] of inputs) {
    text.value = root.style.getPropertyValue(name).trim();
    paint(name);
  }
  paintDerived();
}

function clearColorOverrides() {
  for (const [name] of SEEDS) root.style.removeProperty(name);
  for (const t of THEMES) {
    for (const [name] of SEEDS) delete state[t][name];
  }
  for (const [name] of SEEDS) delete state.global[name];
  syncSeeds();
  store.setJSON(LIVE, state);
}

ui.on(ui.el('#colorReset'), 'click', () => {
  clearColorOverrides();
  ui.toast('Colour overrides cleared in both themes', 'info', 1800);
});

const LIVE = 'ge2-test:tokens';
const KEEP = 'ge2-test:buckets';

const empty = () => ({ global: {}, light: {}, dark: {} });

function migrate(raw) {
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

function capture() {
  const global = {}, themed = {};
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (!prop.startsWith('--')) continue;
    (THEMED.has(prop) ? themed : global)[prop] = root.style.getPropertyValue(prop).trim();
  }
  if (root.style.fontSize) global['font-size'] = root.style.fontSize;
  return { global, themed };
}

function persist() {
  const { global, themed } = capture();
  state.global = global;
  state[themeNow()] = themed;
  store.setJSON(LIVE, state);
}

function applyState() {
  for (const [name] of SEEDS) root.style.removeProperty(name);
  root.style.removeProperty('--leading');
  root.style.removeProperty('--font-sans');
  for (const name of TYPO_TOKENS) root.style.removeProperty(name);
  root.style.fontSize = '';

  const values = { ...state.global, ...state[themeNow()] };
  for (const [prop, value] of Object.entries(values)) {
    if (prop === 'font-size') root.style.fontSize = value;
    else root.style.setProperty(prop, value);
  }

  syncSeeds();
  rootSize.value = parseInt(values['font-size'] ?? '16', 10) || 16;
  out('rootSizeVal', `${rootSize.value}px`);
  leading.value = values['--leading'] ?? 1.5;
  out('leadingVal', String(leading.value));
  if (fontFamily) fontFamily.value = values['--font-sans'] ?? '';
  syncTypography();
  paintDerived();
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
  all[name] = structuredClone(state);
  store.setJSON(KEEP, all);
  refreshBuckets(name);
  ui.toast(`Saved "${name}"`, 'success', 1500);
});

ui.on(ui.el('#bucketLoad'), 'click', () => {
  const name = bucketList.value;
  const values = store.getJSON(KEEP, {})[name];
  if (!values) { ui.toast('Nothing to load', 'warning', 1500); return; }
  state = migrate(values);
  applyState();
  store.setJSON(LIVE, state);
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
  state = empty();
  applyState();
  store.setJSON(LIVE, state);
  ui.toast('Back to the stylesheet values, both themes', 'info', 1800);
});

ui.on(ui.el('#varsDownload'), 'click', async () => {
  persist();

  const block = (sel, obj) => {
    const list = Object.entries(obj ?? {});
    return list.length
      ? `\n${sel} {\n${list.map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}\n` : '';
  };

  const count = ['global', ...THEMES]
    .reduce((n, k) => n + Object.keys(state[k] ?? {}).length, 0);
  if (!count) { ui.toast('No overrides to export', 'warning', 1800); return; }

  let base = '';
  try {
    const res = await fetch(new URL('../css/ge2/vars.css', import.meta.url).pathname, { cache: 'no-store' });
    base = res.ok ? await res.text() : '';
  } catch { }

  const stamp = new Date().toISOString().slice(0, 10);
  const body = block(':root', state.global)
    + THEMES.map((t) => block(`:root[data-theme='${t}']`, state[t])).join('');

  const css = `${base}
/* ── exported from the token playground, ${stamp} ──────────
   Appended, so these win over the declarations above. The :root block holds
   what vars.css declares outside a theme; the [data-theme] blocks hold the
   rest. Both themes are written, so switching keeps working. */
${body}`;

  const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = base ? 'vars.css' : 'vars-overrides.css';
  a.click();
  URL.revokeObjectURL(url);

  const per = THEMES.filter((t) => Object.keys(state[t] ?? {}).length);
  out('bucketOut', `exported ${count} override${count === 1 ? '' : 's'}`
    + (per.length ? ` (${per.join(' + ')})` : '')
    + (base ? '' : ' — fragment, vars.css could not be read'));
});

const rootSize = ui.el('#rootSize');
ui.on(rootSize, 'input', () => {
  root.style.fontSize = `${rootSize.value}px`;
  out('rootSizeVal', `${rootSize.value}px`);
  paintDerived();
  persist();
});

const leading = ui.el('#leading');
ui.on(leading, 'input', () => {
  root.style.setProperty('--leading', leading.value);
  out('leadingVal', leading.value);
  persist();
});

const fontFamily = ui.el('#fontFamily');
ui.on(fontFamily, 'change', (e) => {
  if (e.target.value) root.style.setProperty('--font-sans', e.target.value);
  else root.style.removeProperty('--font-sans');
  persist();
});

// Element typography — global tokens, so they land in state.global and the
// :root block of the export, like --leading and --font-sans.
const syncTypography = mountTypography(ui.el('#typoEditors'), persist);
ui.on(ui.el('#typoReset'), 'click', () => {
  for (const name of TYPO_TOKENS) root.style.removeProperty(name);
  syncTypography();
  persist();
  ui.toast('Typography back to the stylesheet', 'info', 1500);
});

applyState();
persist();
refreshBuckets();
