// script.js — root ES module, loaded by boiler.html.
// Importing ui.js applies the theme before first paint; nothing else auto-runs.

import { ui } from './js/ge2/ui.js';
import { icx } from './js/ge2/icons.js';

icx.observe();     // hydrate [data-icon] now and whatever is added later
ui.tabs();         // both are no-ops when the page has no such markup
ui.accordion();

// Opt-in: ui.handleForm(form, fn) · ui.modal('open', id) · ui.onKey(...)

console.log('[msg]');
