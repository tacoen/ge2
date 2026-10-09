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
