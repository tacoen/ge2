// js/ge-maker/ui-theme.js — --ac, its scale toward --bg and --fg, and a demo
// pane painted from it.
//
// --ac, --bg and --fg start as the theme's own values from css/ge2/vars.css.
// An override is set inline on the panel only, so it previews without
// touching the page. The scale is re-declared on the panel too: vars.css
// computes it on :root, where a panel override of --ac can't reach.

import { ui } from '../ge2/ui.js';
import { store } from '../ge2/store.js';
import { out, toHex, tokenValue } from './util.js';

const KEY = 'ge2-test:ui-theme';
// The scale, as in vars.css: --ac stepped toward --bg (bg1…bg5) and toward
// --fg (fg1…fg5) — the number is how much of --bg / --fg goes in…
const STEPS = [15, 30, 45, 60, 85];
const SCALE = ['bg', 'fg'].flatMap((end) => STEPS.map((pct, i) =>
  [`ac-${end}${i + 1}`, `color-mix(in srgb, var(--ac), var(--${end}) ${pct}%)`]));
// …and toward transparent (tr1…tr4): --ac at 75, 50, 25 and 5% opacity.
const TRANSPARENT = [25, 50, 75, 95].map((pct, i) =>
  [`ac-tr${i + 1}`, `color-mix(in srgb, var(--ac), transparent ${pct}%)`]);
// What each step is for, printed beside its name; the demo uses the steps
// in these roles.
const ROLES = {
  'ac-bg5': 'muted · subtle',
  'ac-bg4': 'border',
  'ac-bg3': 'inset · hover',
  'ac-bg2': 'active',
  'ac-bg1': 'focus ring',
  'ac': 'solid',
  'ac-fg1': 'solid hover',
  'ac-fg2': 'shade · link',
  'ac-fg3': 'text',
  'ac-fg4': 'strong text',
  'ac-fg5': 'heading',
  'ac-tr1': '',
  'ac-tr2': 'selection',
  'ac-tr3': 'focus outline',
  'ac-tr4': 'overlay',
};

// Tokens vars.css maps onto the scale, by the role labels above.
const MAPPED = [
  ['bg-subtle', 'ac-bg5'], ['bg-muted', 'ac-bg5'], ['bg-inset', 'ac-bg3'], ['bg-overlay', 'ac-tr4'],
  ['border-muted', 'ac-bg5'], ['border', 'ac-bg4'], ['border-hover', 'ac-bg3'], ['focus-color', 'ac-bg1'],
  ['muted', 'ac-fg3'], ['subtle', 'ac-fg2'],
];

// Component seeds: buttons, cards and the like take their tone from these.
const SEEDS = [['pr', 'Primary'], ['wr', 'Warning'], ['da', 'Danger'], ['sc', 'Success'], ['in', 'Info/Confirm']];
// Each seed's tones, as vars.css derives them. Re-declared on the panel so a
// seed override reaches them (vars.css computes them on :root).
const TONES = SEEDS.flatMap(([t]) => [
  [t, `color-mix(in srgb, var(--seed-${t}), var(--fg) var(--tone-fg))`],
  [`${t}-subtle`, `color-mix(in srgb, var(--bg), var(--${t}) 10%)`],
  [`${t}-bg`, `color-mix(in srgb, var(--bg), var(--${t}) 20%)`],
  [`${t}-border`, `color-mix(in srgb, var(--bg), var(--${t}) 40%)`],
  [`${t}-bg-text`, 'var(--fg)'],
]);

const panel = ui.el('#themePanel');

// Per seed: a labelled field (swatch, text, picker) in the Swatch column.
// Built before the fields are looked up.
const seedList = ui.el('#seedList');
for (const [t, role] of SEEDS) {
  const id = `seed${t[0].toUpperCase()}${t.slice(1)}`;
  const item = document.createElement('div');
  item.innerHTML = `
    <label for="${id}" title="--seed-${t}">${role}</label>
    <div class="ac-row"><span class="preview-color-box main" data-swatch="seed-${t}"></span><input type="text" id="${id}" name="seed-${t}" spellcheck="false" autocomplete="off"><input type="color" name="seed-${t}-pick" aria-label="Pick --seed-${t}"></div>`;
  seedList.append(item);
}

const field = (name) => panel.querySelector(`[name="${name}"]`);
// Each defaults to the current theme's value; overrides are kept per theme
// ('ac-light', 'bg-dark'…), so switching theme switches them too.
const THEMED = ['ac', 'bg', 'fg', ...SEEDS.map(([t]) => `seed-${t}`)];
const themedKey = (name) => `${name}-${ui.getTheme() || 'light'}`;
const themeValue = (name) => tokenValue(`--${name}`);

// Saved state: { 'ac-light', 'bg-light', 'seed-pr-light', 'ac-dark', … } —
// empty strings are dropped.
const state = store.getJSON(KEY, {});
// Keys from before the page used --ac, before overrides were per theme, or
// from the old label field.
delete state.label;
delete state.co;
delete state.bg;
delete state.fg;
const save = () => store.setJSON(KEY, state);

function apply() {
  for (const name of THEMED) {
    const v = state[themedKey(name)];
    if (v) panel.style.setProperty(`--${name}`, v);
    else panel.style.removeProperty(`--${name}`);
  }
  for (const [name, formula] of [...SCALE, ...TRANSPARENT, ...TONES]) panel.style.setProperty(`--${name}`, formula);
  // vars.css points surfaces, borders and focus at the scale; re-point them
  // here so they follow a panel override too.
  for (const [name, step] of MAPPED) panel.style.setProperty(`--${name}`, `var(--${step})`);
  for (const name of THEMED) {
    field(`${name}-pick`).value = toHex(getComputedStyle(panel).getPropertyValue(`--${name}`).trim());
  }

  const theme = ui.getTheme();
  out('themeCss', [
    ...['bg', 'fg'].filter((name) => state[themedKey(name)])
      .map((name) => `--${name}: ${state[themedKey(name)]};  /* ${theme} */`),
    `--ac: ${state[themedKey('ac')] || themeValue('ac')};  /* ${theme} */`,
    ...[...SCALE, ...TRANSPARENT].map(([name, formula]) => `--${name}: ${formula};`),
    '',
    ...SEEDS.map(([t, role]) =>
      `--seed-${t}: ${state[themedKey(`seed-${t}`)] || themeValue(`seed-${t}`)};  /* ${role} */`),
    // the share of --fg the tones below mix into each seed
    `--tone-fg: ${themeValue('tone-fg')};  /* ${theme} */`,
    // each seed's tones, one block per seed
    ...SEEDS.flatMap(([t]) => ['', ...TONES.filter(([name]) => name === t || name.startsWith(`${t}-`))
      .map(([name, formula]) => `--${name}: ${formula};`)]),
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

for (const name of THEMED) {
  const swatch = panel.querySelector(`[data-swatch="${name}"]`);
  swatch.style.background = `var(--${name})`;
}

// The scale runs top to bottom from the --bg end to the --fg end:
// bg5 … bg1, ac, fg1 … fg5, then the transparent steps tr1 … tr4.
const bar = panel.querySelector('.ac-scale');
for (const name of [...SCALE.slice(0, 5).map(([n]) => n).reverse(), 'ac', ...SCALE.slice(5).map(([n]) => n), ...TRANSPARENT.map(([n]) => n)]) {
  const step = document.createElement('span');
  step.dataset.acStep = name;
  step.title = `--${name}`;
  step.style.setProperty('--step', `var(--${name})`);
  const key = document.createElement('b');
  key.textContent = name.replace(/^ac-?/, '') || 'ac';
  const role = document.createElement('small');
  role.textContent = ROLES[name];
  step.append(key, role);
  bar.append(step);
}

for (const name of THEMED) bind(field(name), () => themedKey(name), () => themeValue(name));

// A swatch restores its field to the theme's value from vars.css, dropping
// the override. It acts as a button: click, Enter or Space.
for (const name of THEMED) {
  const swatch = panel.querySelector(`[data-swatch="${name}"]`);
  swatch.setAttribute('role', 'button');
  swatch.tabIndex = 0;
  swatch.title = `--${name}: restore the theme value`;
  const restore = () => {
    delete state[themedKey(name)];
    field(name).value = themeValue(name);
    save();
    apply();
  };
  ui.on(swatch, 'click', restore);
  ui.on(swatch, 'keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    restore();
  });
}

// A picker writes hex into its text field, which stays the real control.
for (const name of THEMED) {
  const text = field(name);
  ui.on(field(`${name}-pick`), 'input', (e) => {
    text.value = e.target.value;
    text.dispatchEvent(new Event('input'));
  });
}

apply();

// A theme switch shows that theme's --ac / --bg / --fg — its override, else
// the theme's own value — and recomputes everything, pickers included.
new MutationObserver(() => {
  for (const name of THEMED) field(name).value = state[themedKey(name)] ?? themeValue(name);
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
