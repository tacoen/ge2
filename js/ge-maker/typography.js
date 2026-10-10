// js/ge-maker/typography.js — the element-typography table on the Token page.
//
// One row per element (body, h1–h6, small, pre, blockquote), one <select> per property. Every
// option is a token, so the choice is written as var(--token) onto <html> —
// the same inline overrides token.js persists, buckets and exports. The
// first option is "default": no override, the stylesheet value applies.
import { ui } from '../ge2/ui.js';
import { tokenValue } from './util.js';

const root = document.documentElement;

const FONT = ['--font-sans', '--font-serif', '--font-mono'];
const SIZE = ['--text-xs', '--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl'];
const WEIGHT = ['--w-thin', '--w-normal', '--w-medium', '--w-bold'];
const COLOR = ['--fg', '--muted', '--subtle', '--ac', '--pr', '--sc', '--da', '--wr'];

// The heading size token is --h1 itself, so its options stay on --text-*:
// offering another --hN could close a loop (--h1: var(--h2), --h2: var(--h1)).
const heading = (n) => ({
  label: `h${n}`,
  sample: `<h${n}>Heading ${n}</h${n}>`,
  tokens: { font: `--h${n}-font`, size: `--h${n}`, weight: `--h${n}-weight`, color: `--h${n}-color` },
});

const ROWS = [
  {
    label: 'body',
    sample: '<p>Body text — the quick brown fox.</p>',
    tokens: { font: '--body-font', size: '--body-size', weight: '--body-weight', color: '--body-color' },
  },
  ...[1, 2, 3, 4, 5, 6].map(heading),
  {
    label: 'small',
    sample: '<p><small>small print — terms apply</small></p>',
    tokens: { font: '--small-font', size: '--small-size', weight: '--small-weight', color: '--small-color' },
  },
  {
    label: 'pre',
    sample: '<pre>const x = 42;</pre>',
    tokens: { font: '--pre-font', size: '--pre-size', weight: '--pre-weight', color: '--pre-color' },
  },
  {
    label: 'blockquote',
    sample: '<blockquote>Less, but better.</blockquote>',
    tokens: {
      font: '--blockquote-font', size: '--blockquote-size',
      weight: '--blockquote-weight', color: '--blockquote-color',
    },
  },
];

const PROPS = [
  ['font', 'font', FONT],
  ['size', 'size', SIZE],
  ['weight', 'weight', WEIGHT],
  ['color', 'colour', COLOR],
];

/** Every token the table can override — token.js clears these on reload. */
export const TYPO_TOKENS = ROWS.flatMap((r) => Object.values(r.tokens));

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);

// The value a token is declared with in a :root rule, as written — walking
// imports, layers and @media. Last declaration wins; null when none is found
// (or the sheet is cross-origin and its rules cannot be read).
function declared(name, rules = [...document.styleSheets]) {
  let v = null;
  for (const r of rules) {
    let inner;
    try { inner = r.styleSheet?.cssRules ?? r.cssRules; } catch { continue; }
    if (r.selectorText === ':root') v = r.style.getPropertyValue(name).trim() || v;
    else if (inner) v = declared(name, [...inner]) ?? v;
  }
  return v;
}

// The value the stylesheet gives a token, with any override lifted for the
// read. A plain var(--token) reads as the token it names — --body-font shows
// --font-sans, not the font stack it resolves to. A token left at `initial`
// reads as empty: the property inherits.
function sheetValue(name) {
  const ref = declared(name)?.match(/^var\((--[\w-]+)\)$/);
  if (ref) return ref[1];
  const inline = root.style.getPropertyValue(name);
  if (inline) root.style.removeProperty(name);
  const v = tokenValue(name);
  if (inline) root.style.setProperty(name, inline);
  return v || 'inherit';
}

const short = (v) => (v.length > 18 ? `${v.slice(0, 17)}…` : v);

/**
 * Build the table into `host`. `onChange` runs after every edit (token.js
 * passes persist). Returns sync(), which re-reads the selects from <html>.
 */
export function mountTypography(host, onChange = () => {}) {
  if (!host) return () => {};

  const selects = [];

  const grid = document.createElement('div');
  grid.className = 'typo-grid';
  grid.setAttribute('role', 'table');
  grid.setAttribute('aria-label', 'Element typography tokens');
  grid.innerHTML = '<div class="typo-head" role="row">'
    + ['element', ...PROPS.map(([, label]) => label), 'sample', '']
      .map((h) => `<span role="columnheader">${h}</span>`).join('')
    + '</div>';

  for (const row of ROWS) {
    const tr = document.createElement('div');
    tr.className = 'typo-row';
    tr.setAttribute('role', 'row');

    // Headings and small may follow the body font; body itself may not.
    const fonts = row.label === 'body' ? FONT : ['--body-font', ...FONT];

    tr.innerHTML = `<span class="token-name" role="rowheader"><code>${row.label}</code></span>`
      + PROPS.map(([key, label, list]) => {
        const name = row.tokens[key];
        const opts = (key === 'font' ? fonts : list)
          .map((t) => `<option value="var(${t})">${t}</option>`).join('');
        return `<span role="cell" data-label="${label}"><select data-typo="${name}"`
          + ` aria-label="${row.label} ${label} (${name})" title="${name}">`
          + `<option value="">* ${esc(short(sheetValue(name)))}</option>${opts}`
          + '</select></span>';
      }).join('')
      + `<span class="typo-sample" role="cell">${row.sample}</span>`
      + `<span class="typo-reset" role="cell"><button type="button" class="swatch-reset" title="Reset ${row.label}"`
      + ` aria-label="Reset ${row.label}"><span data-icon="refresh" data-icon-size="14"></span></button></span>`;
    grid.appendChild(tr);

    const mine = [...tr.querySelectorAll('select')];
    selects.push(...mine);

    const mark = () => tr.classList.toggle('changed', mine.some((s) => s.value));

    for (const sel of mine) {
      ui.on(sel, 'change', () => {
        if (sel.value) root.style.setProperty(sel.dataset.typo, sel.value);
        else root.style.removeProperty(sel.dataset.typo);
        mark();
        onChange();
      });
    }

    ui.on(tr.querySelector('.swatch-reset'), 'click', () => {
      for (const sel of mine) {
        sel.value = '';
        root.style.removeProperty(sel.dataset.typo);
      }
      mark();
      onChange();
    });
  }

  const wrap = document.createElement('div');
  wrap.className = 'typo-scroll';
  wrap.appendChild(grid);
  host.appendChild(wrap);

  // An override that is not one of the options (typed into an exported file,
  // say) still shows: it gets an option of its own rather than reading as
  // "default". The default labels are re-read too — --body-color follows
  // --fg, which changes with the theme.
  return function sync() {
    for (const sel of selects) {
      sel.options[0].text = `* ${short(sheetValue(sel.dataset.typo))}`;
      const v = root.style.getPropertyValue(sel.dataset.typo).trim();
      if (v && ![...sel.options].some((o) => o.value === v)) {
        sel.add(new Option(v, v));
      }
      sel.value = v;
    }
    for (const tr of grid.querySelectorAll('.typo-row')) {
      tr.classList.toggle('changed', [...tr.querySelectorAll('select')].some((s) => s.value));
    }
  };
}

export default mountTypography;
