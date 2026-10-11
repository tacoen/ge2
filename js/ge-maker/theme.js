// js/ge-maker/theme.js — the theme switch, and the colour editor: --ac, --bg,
// --fg and the five component seeds, the --ac scale, and demos painted from
// them.
//
// Every field starts at the stylesheet's value for the current theme. An edit
// is a real override, set on <html> through js/ge-maker/overrides.js: the
// whole page follows it, it is kept per theme, it shows on every demo page,
// and the buckets and vars-overrides.css export carry it.

import { ui } from '../ge2/ui.js';
import { store } from '../ge2/store.js';
import { out, toHex, tokenValue } from './util.js';
import * as ov from './overrides.js';
// type, typography and buckets, further down the page
import './type.js';

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
  'ac-fg2': 'shade',
  'ac-fg3': 'text',
  'ac-fg4': 'strong text',
  'ac-fg5': 'heading',
  'ac-tr1': '',
  'ac-tr2': 'selection',
  'ac-tr3': 'focus outline',
  'ac-tr4': 'overlay',
};

// Component seeds: buttons, cards and the like take their tone from these.
const SEEDS = [['pr', 'Primary'], ['wr', 'Warning'], ['da', 'Danger'], ['sc', 'Success'], ['in', 'Info/Confirm']];
// Each seed's tones, as vars.css derives them — for the CSS readout.
const TONES = SEEDS.flatMap(([t]) => [
  [t, `color-mix(in srgb, var(--seed-${t}), var(--fg) var(--tone-fg))`],
  [`${t}-subtle`, `color-mix(in srgb, var(--bg), var(--${t}) 10%)`],
  [`${t}-bg`, `color-mix(in srgb, var(--bg), var(--${t}) 20%)`],
  [`${t}-border`, `color-mix(in srgb, var(--bg), var(--${t}) 40%)`],
  [`${t}-bg-text`, 'var(--fg)'],
]);

// Theme switch. Through overrides.js, so each theme's overrides swap in.
const showTheme = () => {
  out('themeOut', `data-theme = ${ui.getTheme()}`);
  out('colourTheme', ov.themeNow());
};
ui.on(ui.el('#themeLight'),  'click', () => ov.switchTheme(() => ui.setTheme('light')));
ui.on(ui.el('#themeDark'),   'click', () => ov.switchTheme(() => ui.setTheme('dark')));
ui.on(ui.el('#themeToggle'), 'click', () => ov.switchTheme(() => ui.toggleTheme()));
ov.onChange(showTheme);
showTheme();

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
// Field name → the token it overrides. The accent field edits --seed-ac,
// which --ac is.
const TOKEN = { ac: '--seed-ac', bg: '--bg', fg: '--fg' };
for (const [t] of SEEDS) TOKEN[`seed-${t}`] = `--seed-${t}`;
const FIELDS = Object.keys(TOKEN);
const value = (name) => ov.override(TOKEN[name]) || ov.sheetValue(TOKEN[name]);

// Pickers and the readout follow the page; the fields are left alone while
// someone types in them.
function paint() {
  const theme = ui.getTheme();
  for (const name of FIELDS) {
    field(`${name}-pick`).value = toHex(value(name));
    field(name).closest('div').classList.toggle('changed', Boolean(ov.override(TOKEN[name])));
  }
  out('themeCss', [
    ...['bg', 'fg'].filter((name) => ov.override(TOKEN[name]))
      .map((name) => `--${name}: ${ov.override(TOKEN[name])};  /* ${theme} */`),
    `--ac: ${value('ac')};  /* ${theme} */`,
    ...[...SCALE, ...TRANSPARENT].map(([name, formula]) => `--${name}: ${formula};`),
    '',
    ...SEEDS.map(([t, role]) => `--seed-${t}: ${value(`seed-${t}`)};  /* ${role} */`),
    // the share of --fg the tones below mix into each seed
    `--tone-fg: ${tokenValue('--tone-fg')};  /* ${theme} */`,
    // each seed's tones, one block per seed
    ...SEEDS.flatMap(([t]) => ['', ...TONES.filter(([name]) => name === t || name.startsWith(`${t}-`))
      .map(([name, formula]) => `--${name}: ${formula};`)]),
  ].join('\n'));
}

// Fields show the value in force — the override, else the stylesheet's —
// and are refilled after a theme switch, a bucket load or a reset.
const fill = () => { for (const name of FIELDS) field(name).value = value(name); };

for (const name of FIELDS) {
  ui.el(`[data-swatch="${name}"]`).style.background = `var(${TOKEN[name] === '--seed-ac' ? '--ac' : TOKEN[name]})`;
}

// The scale runs top to bottom from the --bg end to the --fg end:
// bg5 … bg1, ac, fg1 … fg5, then the transparent steps tr1 … tr4.
const bar = ui.el('.ac-scale');
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

// Typing sets the override; clearing the field, or typing the stylesheet's
// own value, drops it. An empty field refills once focus leaves.
for (const name of FIELDS) {
  const input = field(name);
  ui.on(input, 'input', () => ov.set(TOKEN[name], input.value));
  ui.on(input, 'change', () => { if (!input.value.trim()) input.value = value(name); });
}

// A swatch restores the stylesheet's value, dropping the override. It acts
// as a button: click, Enter or Space.
for (const name of FIELDS) {
  const swatch = ui.el(`[data-swatch="${name}"]`);
  swatch.setAttribute('role', 'button');
  swatch.tabIndex = 0;
  swatch.title = `${TOKEN[name]}: restore the stylesheet value`;
  const restore = () => { ov.set(TOKEN[name], ''); field(name).value = value(name); };
  ui.on(swatch, 'click', restore);
  ui.on(swatch, 'keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    restore();
  });
}

// A picker writes hex into its text field, which stays the real control.
for (const name of FIELDS) {
  const text = field(name);
  ui.on(field(`${name}-pick`), 'input', (e) => {
    text.value = e.target.value;
    text.dispatchEvent(new Event('input'));
  });
}

ui.on(ui.el('#colourReset'), 'click', () => {
  ov.clear(Object.values(TOKEN));
  fill();
  ui.toast('Colours back to the stylesheet, both themes', 'info', 1800);
});

// A theme switch or a bucket load changes the values underneath: refill.
// A plain edit only repaints, so the field being typed in keeps its text.
let typing = false;
panel.addEventListener('focusin', (e) => { typing = e.target.matches('input[type="text"]'); });
panel.addEventListener('focusout', () => { typing = false; });
ov.onChange(() => { if (!typing) fill(); paint(); });
fill();
paint();

// The Derived and CSS accordions remember whether they were left open.
// ui.accordion() fires no event, so watch the item's class instead — that
// catches a click, Enter / Space and Escape alike. A saved state that differs
// from the markup's is restored with a click, so the accordion's own handler
// keeps aria-expanded in step. Derived starts open, CSS closed.
for (const [id, key] of [['#derivedItem', 'ge2-test:ui-theme-derived'], ['#cssItem', 'ge2-test:ui-theme-css']]) {
  const item = ui.el(id);
  const isOpen = () => item.classList.contains('active');
  const saved = store.get(key);
  if (saved && (saved === '1') !== isOpen()) item.querySelector('.accordion-header').click();
  new MutationObserver(() => store.set(key, isOpen() ? '1' : '0'))
    .observe(item, { attributes: true, attributeFilter: ['class'] });
}
