// js/ge-maker/component.js — toast, copy, onKey and modal.

import { ui } from '../ge2/ui.js';
import { out } from './util.js';

// ── buttons ───────────────────────────────────────────
// The utils.css button classes: a style class (solid = plain .btn) plus an
// optional tone class; the grid is rebuilt per style.
const tones = ['', 'pr', 'sc', 'da', 'wr', 'ac'];
const kinds = ['solid', 'rounded', 'plain', 'outline', 'naked', 'link'];
const states = [
  ['rest', ''],
  [':hover', 'is-hover'],
  [':focus', 'is-focus'],
  [':disabled', ''],
  ['live', ''],
];

const btnGrid = ui.el('#btnGrid');
const buildButtons = (kind) => {
  btnGrid.replaceChildren();
  for (const label of ['', ...states.map(([s]) => s)]) {
    const head = document.createElement('span');
    head.className = 'head';
    head.textContent = label;
    btnGrid.append(head);
  }
  for (const tone of tones) {
    const cls = ['btn', kind === 'solid' ? '' : kind, tone].filter(Boolean).join(' ');
    const name = document.createElement('code');
    name.textContent = `.${cls.replaceAll(' ', '.')}`;
    btnGrid.append(name);
    for (const [state, force] of states) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Button';
      b.className = [cls, force].filter(Boolean).join(' ');
      if (force) b.tabIndex = -1;
      b.disabled = state === ':disabled';
      btnGrid.append(b);
    }
  }
};

const kindBar = ui.el('#btnKinds');
for (const kind of kinds) {
  const b = document.createElement('button');
  b.type = 'button';
  // each picker button wears the style it picks: 'naked' is a .btn.naked
  b.className = kind === 'solid' ? 'btn' : `btn ${kind}`;
  b.textContent = kind;
  kindBar.append(b);
}
// the picked style wears .pr; aria-pressed is for screen readers
const pickKind = (kind) => {
  for (const b of kindBar.children) {
    const on = b.textContent === kind;
    b.classList.toggle('pr', on);
    b.setAttribute('aria-pressed', on);
  }
  buildButtons(kind);
};
ui.on(kindBar, 'click', (e) => {
  const b = e.target.closest('button');
  if (b) pickKind(b.textContent);
});
pickKind(kinds[0]);

// sizes: one row per size token, one column per style, in --pr
const sizes = ['vxs', 'xs', 'sm', 'md', 'lg', 'xlg'];
const sizeGrid = ui.el('#btnSizes');
for (const label of ['', ...kinds]) {
  const head = document.createElement('span');
  head.className = 'head';
  head.textContent = label;
  sizeGrid.append(head);
}
for (const size of sizes) {
  const name = document.createElement('code');
  name.textContent = `.${size}`;
  sizeGrid.append(name);
  for (const kind of kinds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Button';
    b.className = ['btn', kind === 'solid' ? '' : kind, 'pr', size].filter(Boolean).join(' ');
    sizeGrid.append(b);
  }
}

// ── toast ─────────────────────────────────────────────
for (const type of ['info', 'success', 'error', 'warning']) {
  ui.on(ui.el(`#toast-${type}`), 'click', () => ui.toast(`${type} toast`, type));
}
ui.on(ui.el('#toastError'), 'click', () => ui.error('deliberate error() call'));

// ── copy ──────────────────────────────────────────────
ui.copy(ui.el('#copyArea'), ui.el('#copySrcArea'));
ui.copy(ui.el('#copyPre'), ui.el('#copySrcPre'), { success: 'Got it', duration: 1000 });

// ── keyboard ──────────────────────────────────────────
const unbindK = ui.onKey('Ctrl+K', () => {
  out('keyOut', 'Ctrl+K fired');
  ui.toast('Ctrl+K (demo search)', 'info', 1500);
});

// Plain-key binding: no preventDefault so it does not eat normal typing.
ui.onKey('Shift+?', () => out('keyOut', 'Shift+? fired'), { preventDefault: false });

ui.on(ui.el('#keyUnbind'), 'click', () => {
  unbindK();
  out('keyOut', 'Ctrl+K unbound — press it again, nothing should happen');
});

// ── modal ─────────────────────────────────────────────
ui.on(ui.el('#modalOpen'), 'click', () => ui.modal('open', 'demoModal'));
ui.on(ui.el('#modalClose'), 'click', () => ui.modal('close', 'demoModal'));
ui.on(ui.el('#modalMissing'), 'click', () => ui.modal('open', 'nope-does-not-exist'));

// ── menus ─────────────────────────────────────────────
ui.dropdown();
ui.contextmenu();

const report = (id) => (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act) out(id, `chose "${act}"`);
};
ui.on(ui.el('#demoDropdown'), 'click', report('dropdownOut'));
ui.on(ui.el('#demoContext'), 'click', report('contextOut'));
