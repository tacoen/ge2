// js/ge-maker/ui-theme.js — one colour (--co), its scale toward --bg and
// --fg, and a demo pane painted from it.
//
// This module is the single source of the --co tokens: it writes them inline
// on the panel, so css/ge-maker.css only consumes them.

import { ui } from '../ge2/ui.js';
import { store } from '../ge2/store.js';
import { out, toHex, tokenValue } from './util.js';

const KEY = 'ge2-test:ui-theme';
const BASE = '#66CCDD';
// The scale: --co stepped toward --bg (bg1…bg5) and toward --fg
// (fg1…fg5). The number is how much of --bg / --fg goes in.
const STEPS = [15, 30, 45, 60, 85];
const SCALE = ['bg', 'fg'].flatMap((end) => STEPS.map((pct, i) =>
  [`co-${end}${i + 1}`, `color-mix(in srgb, var(--co), var(--${end}) ${pct}%)`]));
// …and toward transparent (tr1…tr3): --co at 75, 50 and 25% opacity.
const TRANSPARENT = [25, 50, 75].map((pct, i) =>
  [`co-tr${i + 1}`, `color-mix(in srgb, var(--co), transparent ${pct}%)`]);
// What each step is for, printed beside its name; the demo uses the steps
// in these roles.
const ROLES = {
  'co-bg5': 'muted · subtle',
  'co-bg4': 'border',
  'co-bg3': 'inset · hover',
  'co-bg2': 'active',
  'co-bg1': 'focus ring',
  'co': 'solid',
  'co-fg1': 'solid hover',
  'co-fg2': 'shade · link',
  'co-fg3': 'text',
  'co-fg4': 'strong text',
  'co-fg5': 'heading',
  'co-tr1': 'overlay',
  'co-tr2': 'selection',
  'co-tr3': 'focus outline',
};

const panel = ui.el('#themePanel');
const field = (name) => panel.querySelector(`[name="${name}"]`);
const label = field('co-label');
const co = field('co');
const pick = field('co-pick');
// --bg and --fg default to the theme's; an override is set on the panel only,
// so the scale and the demo mix against it. Overrides are kept per theme
// ('bg-light', 'fg-dark'…), so switching theme switches them too.
const ENDS = ['bg', 'fg'];
const endKey = (name) => `${name}-${ui.getTheme() || 'light'}`;
const themeEnd = (name) => tokenValue(`--${name}`);

// Saved state: { label, co, 'bg-light', 'fg-light', 'bg-dark', 'fg-dark' } —
// empty strings are dropped.
const state = store.getJSON(KEY, {});
// Overrides saved before they were per theme followed no theme; drop them.
delete state.bg;
delete state.fg;
const save = () => store.setJSON(KEY, state);

// The label becomes a token prefix, so keep it to what a custom property allows.
const prefix = () => (state.label ?? '').trim().toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'co';

function apply() {
  for (const name of ENDS) {
    const v = state[endKey(name)];
    if (v) panel.style.setProperty(`--${name}`, v);
    else panel.style.removeProperty(`--${name}`);
    field(`${name}-pick`).value = toHex(getComputedStyle(panel).getPropertyValue(`--${name}`).trim());
  }
  panel.style.setProperty('--co', state.co || BASE);
  for (const [name, formula] of [...SCALE, ...TRANSPARENT]) panel.style.setProperty(`--${name}`, formula);
  pick.value = toHex(getComputedStyle(panel).getPropertyValue('--co').trim());

  const p = prefix();
  for (const el of panel.querySelectorAll('[data-co-label]')) el.textContent = p;
  // Each swatch's tooltip is its token, named after the label.
  panel.querySelector('.preview-color-box.main').title = `--${p}`;
  for (const el of panel.querySelectorAll('[data-co-step]')) {
    el.title = `--${el.dataset.coStep.replace(/^co/, p)}`;
  }
  // The readout names the tokens after the label, references included.
  const rename = (v) => v.replaceAll('var(--co)', `var(--${p})`);
  out('themeCss', [
    ...ENDS.filter((name) => state[endKey(name)])
      .map((name) => `--${name}: ${state[endKey(name)]};  /* ${ui.getTheme()} */`),
    `--${p}: ${state.co || BASE};`,
    ...[...SCALE, ...TRANSPARENT].map(([name, formula]) =>
      `--${name.replace(/^co/, p)}: ${rename(formula)};`),
  ].join('\n'));
}

// A field shows its value — the override, else the default — and stays
// editable. Only a value that differs from the default is saved; clearing a
// field drops the override and refills the default once focus leaves. `key`
// and `fallback` may be functions, for values that change with the theme.
function bind(input, key, fallback = '') {
  const k = typeof key === 'function' ? key : () => key;
  const f = typeof fallback === 'function' ? fallback : () => fallback;
  input.value = state[k()] ?? f();
  ui.on(input, 'input', () => {
    const v = input.value.trim();
    if (v && v.toLowerCase() !== f().toLowerCase()) state[k()] = v;
    else delete state[k()];
    save();
    apply();
  });
  ui.on(input, 'change', () => {
    if (!input.value.trim()) input.value = f();
  });
}

co.placeholder = BASE;
panel.querySelector('.preview-color-box.main').style.background = 'var(--co)';
for (const name of ENDS) {
  const swatch = panel.querySelector(`[data-co="${name}"]`);
  swatch.style.background = `var(--${name})`;
  swatch.title = `--${name}`;
}

// The scale runs top to bottom from the --bg end to the --fg end:
// bg5 … bg1, co, fg1 … fg5, then the transparent steps tr1 … tr3.
const bar = panel.querySelector('.co-scale');
for (const name of [...SCALE.slice(0, 5).map(([n]) => n).reverse(), 'co', ...SCALE.slice(5).map(([n]) => n), ...TRANSPARENT.map(([n]) => n)]) {
  const step = document.createElement('span');
  step.dataset.coStep = name;
  step.style.setProperty('--step', `var(--${name})`);
  const key = document.createElement('b');
  key.textContent = name.replace(/^co-?/, '') || 'co';
  const role = document.createElement('small');
  role.textContent = ROLES[name];
  step.append(key, role);
  bar.append(step);
}

bind(label, 'label');
bind(co, 'co', BASE);
// Their default is the current theme's own value, read from vars.css.
for (const name of ENDS) bind(field(name), () => endKey(name), () => themeEnd(name));

// A label that names a seed in vars.css (pr, in, wr…) pulls in that seed's
// current value. Runs after bind's listener, so state.label is up to date.
ui.on(label, 'input', () => {
  const seed = tokenValue(`--seed-${prefix()}`);
  if (!seed) return;
  co.value = seed;
  co.dispatchEvent(new Event('input'));
});

// A picker writes hex into its text field, which stays the real control.
for (const name of ['co', ...ENDS]) {
  const text = field(name);
  ui.on(field(`${name}-pick`), 'input', (e) => {
    text.value = e.target.value;
    text.dispatchEvent(new Event('input'));
  });
}

apply();

// A theme switch shows that theme's --bg / --fg — its override, else the
// theme's own value — and recomputes everything, pickers included.
new MutationObserver(() => {
  for (const name of ENDS) field(name).value = state[endKey(name)] ?? themeEnd(name);
  apply();
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// The Derived accordion remembers whether it was left open. ui.accordion()
// fires no event, so watch the item's class instead — that catches a click,
// Enter / Space and Escape alike. A saved "closed" is restored with a click,
// so the accordion's own handler keeps aria-expanded in step.
const OPEN = 'ge2-test:ui-theme-derived';
const derived = ui.el('#derivedItem');
const isOpen = () => derived.classList.contains('active');
if (store.get(OPEN) === '0' && isOpen()) derived.querySelector('.accordion-header').click();
new MutationObserver(() => store.set(OPEN, isOpen() ? '1' : '0'))
  .observe(derived, { attributes: true, attributeFilter: ['class'] });
