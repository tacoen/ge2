// js/ge2/icons.js — inline Hugeicons SVGs, exported as `icx`.
//
//   import { icx } from './ge2/icons.js';
//   icx.observe();                    // hydrate <span data-icon="search">
//   icx.svg('search', { size: 20 })   // or get the markup directly
//
// Sizing and stroke come from the --icon-* tokens (vars.css, applied by
// ui.css); per-call opts override them via inline custom properties.
//
// Path data is used as-is from @hugeicons/core-free-icons (Stroke Rounded,
// MIT) — see /LICENSE. Only the `icx` wrapper is ge2 code. Full docs in
// icons.md.
import { ICONS } from './icons-list.js';

const VIEWBOX = '0 0 24 24';
const DEFAULT_SIZE = 24;

/** Bare numbers mean pixels; anything else (rem, %, calc(…)) passes through. */
function len(value) {
  return /^\d+(\.\d+)?$/.test(String(value)) ? `${value}px` : String(value);
}

/**
 * Build an inline <svg> string for a named icon.
 * A per-call size/strokeWidth is emitted as an inline custom property, not a
 * hard value, so it overrides the token without escaping CSS's reach.
 * @param {string} name
 * @param {{size?: number|string, strokeWidth?: number|string, class?: string}} [opts]
 */
function svg(name, opts = {}) {
  const body = ICONS[name];
  if (!body) {
    console.warn(`[icx] unknown icon: "${name}"`);
    return '';
  }

  const { size, strokeWidth, class: className } = opts;
  const cls = className ? `icx ${className}` : 'icx';

  const vars = [];
  if (size) vars.push(`--icon-size:${len(size)}`);
  if (strokeWidth) vars.push(`--icon-stroke-width:${strokeWidth}`);
  const style = vars.length ? ` style="${vars.join(';')}"` : '';

  const px = size || DEFAULT_SIZE;   // fallback for pages without ui.css
  const markup = strokeWidth
    ? body.replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`)
    : body;

  return `<svg class="${cls}"${style} width="${px}" height="${px}" viewBox="${VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${markup}</svg>`;
}

/** Hydrate unhydrated [data-icon] under `root`, honouring
 *  data-icon-size / data-icon-stroke. @param {ParentNode} [root] */
function hydrate(root = document) {
  root.querySelectorAll('[data-icon]:not([data-icx-done])').forEach((el) => {
    const name = el.dataset.icon;
    el.innerHTML = svg(name, {
      size: el.dataset.iconSize,
      strokeWidth: el.dataset.iconStroke,
    });
    el.dataset.icxDone = '1';
  });
}

/** Hydrate now, then watch `root` for [data-icon] added later.
 *  @param {Element} [root] @returns {MutationObserver} */
function observe(root = document.body) {
  hydrate(root);
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('[data-icon]')) hydrate(node.parentElement ?? document);
        else if (node.querySelector) hydrate(node);
      });
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  return mo;
}

export const icx = {
  names: Object.keys(ICONS),
  has: (name) => name in ICONS,
  svg,
  hydrate,
  observe,
};