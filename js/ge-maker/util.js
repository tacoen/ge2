// js/ge-maker/util.js — helpers shared by the demo modules.

/** Write text into an element by id, if the page has one. */
export const out = (id, msg) => {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
};

/**
 * Resolved value of a custom property on :root. The document is looked up on
 * each call rather than captured at import: this module is imported once but
 * may be used against more than one document (tests, iframes).
 */
export const tokenValue = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// A hidden probe the browser resolves colours through, created on first use.
let probe;

/** Any CSS colour (keyword, color-mix(), var()…) as the browser's rgb() string. */
export function resolveColor(value) {
  if (!probe) {
    probe = document.createElement('span');
    probe.style.display = 'none';
    document.body.appendChild(probe);
  }
  probe.style.color = '';
  probe.style.color = value;
  return getComputedStyle(probe).color || 'rgb(0, 0, 0)';
}

/** Any CSS colour as #rrggbb, for an <input type="color">. Alpha is dropped. */
export function toHex(value) {
  const n = resolveColor(value).match(/[\d.]+/g);
  if (!n) return '#000000';
  return '#' + n.slice(0, 3).map((v) => Math.round(+v).toString(16).padStart(2, '0')).join('');
}
