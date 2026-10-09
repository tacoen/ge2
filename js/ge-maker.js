// js/ge-maker.js — shared entry for the ge2 demo pages.
//
// Every page loads this. It does the framework bootstrap, builds the shared
// sidebar from ge2/menu.json, then pulls in the one module that page needs —
// named by <body data-page="…">, so a page only fetches its own demo code.

import { ui } from './ge2/ui.js';
import { icx } from './ge2/icons.js';
import { buildMenu } from './ge-maker/menu.js';
import { hints } from './ge-maker/hints.js';

// ── framework bootstrap — same three calls as the root script.js ──
icx.observe();
ui.tabs();
ui.accordion();

// The sidebar is built before ui.sidebar() runs, so buildMenu wires it.
await buildMenu();

// Fold the explanatory prose behind an icon on each heading. Runs before the
// page module so a demo can still add notes of its own afterwards.
hints();

const page = document.body.dataset.page;
if (page) {
  try {
    await import(`./ge-maker/${page}.js`);
  } catch (e) {
    console.error(`[ge-maker] no demo module for page "${page}"`, e);
  }
}
