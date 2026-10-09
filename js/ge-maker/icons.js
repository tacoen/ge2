// js/ge-maker/icons.js — the icon grid and hydrate/observe demos.

import { ui } from '../ge2/ui.js';
import { icx } from '../ge2/icons.js';
import { ICONS } from '../ge2/icons-list.js';
import { store } from '../ge2/store.js';
import { out } from './util.js';

// ── icons ─────────────────────────────────────
// The catalogue is edited in place: ICONS is the object icx.svg() reads, so
// mutating it makes an edit visible everywhere on the page at once. icx.names
// was snapshotted at import, so the grid keeps its own sorted list.
const KEY = 'ge2-test:icons';
const BUNDLED = { ...ICONS };
const names = () => Object.keys(ICONS).sort((a, b) => a.localeCompare(b));

/** Replace the whole catalogue, keeping the identity ICONS was imported as. */
function setAll(map) {
  for (const k of Object.keys(ICONS)) delete ICONS[k];
  Object.assign(ICONS, map);
}

const saved = store.getJSON(KEY, null);
if (saved && typeof saved === 'object') setAll(saved);

const meta = () => out('iconMeta',
  `${names().length} icons · has('search') = ${icx.has('search')} · has('nope') = ${icx.has('nope')}`
  + (saved ? ' · edited copy from localStorage' : ''));

// svg(): build markup directly, no DOM contract.
const grid = ui.el('#iconsGrid');

function renderGrid() {
  grid.innerHTML = '';
  for (const name of names()) {
    const tile = document.createElement('div');
    tile.className = 'icon-tile';
    tile.innerHTML = `${icx.svg(name)}<span>${name}</span>`
      + `<button type="button" class="icon-edit" data-edit="${name}"`
      + ` title="Edit ${name}" aria-label="Edit ${name}">`
      + '<span data-icon="edit" data-icon-size="12"></span></button>';
    grid.appendChild(tile);
  }

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'icon-tile icon-add';
  add.id = 'iconAddTile';
  add.innerHTML = '<span data-icon="plus" data-icon-size="24"></span><span>add icon</span>';
  grid.appendChild(add);

  meta();
}

renderGrid();

// The grid icons carry no inline overrides, so they follow --icon-* on
// their container.
const setVar = (prop, value) => grid.style.setProperty(prop, value);

const sizeInput = ui.el('#iconSize');
const strokeInput = ui.el('#iconStroke');

ui.on(sizeInput, 'input', () => {
  const rem = `${sizeInput.value / 16}rem`;
  setVar('--icon-size', rem);
  out('sizeVal', `${rem} (${sizeInput.value}px)`);
});

ui.on(strokeInput, 'input', () => {
  setVar('--icon-stroke-width', strokeInput.value);
  out('strokeVal', strokeInput.value);
});

ui.on(ui.el('#iconColor'), 'change', (e) => setVar('--icon-stroke', e.target.value));

// Prove the observer fires — this markup does not exist at hydrate time.
let injected = 0;
ui.on(ui.el('#iconInject'), 'click', () => {
  const name = icx.names[injected % icx.names.length];
  injected++;

  const row = document.createElement('div');
  row.className = 'controls';
  row.innerHTML =
    `<span data-icon="${name}"></span>` +
    `<span data-icon="${name}" data-icon-size="32" data-icon-stroke="1"></span>` +
    `<span data-icon="${name}" data-icon-size="16" data-icon-stroke="3"></span>` +
    `<span class="mono">${name} — default / 32px stroke 1 / 16px stroke 3</span>`;

  ui.el('#iconLive').appendChild(row);
});

// Unknown name: svg() should warn and return '', hydrate() leaves the node empty.
ui.on(ui.el('#iconMissing'), 'click', () => {
  const span = document.createElement('span');
  span.dataset.icon = 'definitely-not-an-icon';
  span.className = 'mono';
  ui.el('#iconLive').appendChild(span);
  out('iconOut', "injected [data-icon=\"definitely-not-an-icon\"] — expect an [icx] console warning and an empty node");
});

// ── add / edit ────────────────────────────────
// icons-list.js stores the body of the <svg>, not the element — icx.svg()
// supplies the wrapper, the viewBox and the token-driven geometry. A pasted
// icon is almost always a whole <svg>, so the wrapper is stripped here
// rather than being something you have to remember.
const SHAPE = /<(path|circle|rect|line|polyline|polygon|ellipse|g|use)\b/i;

function toBody(input) {
  const text = String(input).trim().replace(/\s+/g, ' ');
  if (!/<svg[\s>]/i.test(text)) return text;
  const wrap = document.createElement('div');
  wrap.innerHTML = text;
  return wrap.querySelector('svg')?.innerHTML.trim() ?? '';
}

// Lowercase, hyphens — the key is written as 'name' in the exported file
// and used as a data-icon value, so anything else invites a quoting bug.
const cleanName = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '');

const nameField = ui.el('#iconNameField');
const svgField = ui.el('#iconSvgField');
const preview = ui.el('#iconPreview');
const hint = ui.el('#iconPreviewHint');
const deleteBtn = ui.el('#iconDelete');
let editing = null;   // null while adding

function paintPreview() {
  const body = toBody(svgField.value);
  const ok = Boolean(body) && SHAPE.test(body);
  preview.innerHTML = ok
    ? `<svg class="icx" width="32" height="32" viewBox="0 0 24 24" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`
    : '';
  hint.textContent = !svgField.value.trim() ? 'paste markup to preview'
    : ok ? 'looks like an icon' : 'no shape element found';
}

function openEditor(name) {
  editing = name;
  ui.el('#iconModalTitle').textContent = name ? `Edit ${name}` : 'Add icon';
  deleteBtn.hidden = !name;
  nameField.value = name ?? '';
  svgField.value = name ? ICONS[name] : '';
  paintPreview();
  ui.modal('open', 'iconModal');
  setTimeout(() => nameField.focus(), 0);
}

const persist = () => store.setJSON(KEY, { ...ICONS });

ui.on(grid, 'click', (e) => {
  const edit = e.target.closest('[data-edit]');
  if (edit) { openEditor(edit.dataset.edit); return; }
  if (e.target.closest('#iconAddTile')) openEditor(null);
});

ui.on(ui.el('#iconAdd'), 'click', () => openEditor(null));
ui.on(svgField, 'input', paintPreview);
ui.on(ui.el('#iconCancel'), 'click', () => ui.modal('close', 'iconModal'));

ui.on(ui.el('#iconSave'), 'click', () => {
  const name = cleanName(nameField.value);
  const body = toBody(svgField.value);

  if (!name) { ui.toast('Name it first', 'warning', 1800); nameField.focus(); return; }
  if (!body || !SHAPE.test(body)) {
    ui.toast('That markup has no shape element', 'error', 2200);
    svgField.focus();
    return;
  }
  // Renaming is a delete plus an add, or the old key lingers in the export.
  if (editing && editing !== name) delete ICONS[editing];

  ICONS[name] = body;
  persist();
  renderGrid();
  ui.modal('close', 'iconModal');
  out('iconEditOut', `saved "${name}" · ${names().length} icons`);
});

ui.on(deleteBtn, 'click', () => {
  if (!editing) return;
  delete ICONS[editing];
  persist();
  renderGrid();
  ui.modal('close', 'iconModal');
  out('iconEditOut', `deleted "${editing}" · ${names().length} icons`);
});

ui.on(ui.el('#iconReset'), 'click', () => {
  setAll(BUNDLED);
  store.remove(KEY);
  renderGrid();
  out('iconEditOut', `back to the bundled ${names().length} icons`);
});

// ── export ────────────────────────────────────
// A whole icons-list.js, not a fragment: drop it straight into js/ge2/.
// Values go in template literals, so the double quotes that fill path markup
// need no escaping — only a backtick or ${ would, and those are escaped here.
const escapeBody = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

ui.on(ui.el('#iconExport'), 'click', () => {
  const list = names();
  const body = list.map((n) => `  '${n}': \`${escapeBody(ICONS[n])}\`,`).join('\n');
  const file = `// js/ge2/icons-list.js — the icon data for icons.js. No logic here.
//
// ${list.length} icons. Exported from the ge2 icons harness.
// Entries taken from @hugeicons/core-free-icons (Stroke Rounded, MIT) keep
// the notice in /LICENSE, which must travel with this file.
//
// Adding an icon: see icons.md — don't hand-author path data.

export const ICONS = {
${body}
};

export default ICONS;
`;

  const url = URL.createObjectURL(new Blob([file], { type: 'text/javascript' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'icons-list.js';
  a.click();
  URL.revokeObjectURL(url);
  out('iconEditOut', `exported ${list.length} icons — replace js/ge2/icons-list.js`);
});
