// js/ge-maker/layout.js — the layout demos.

import { ui } from '../ge2/ui.js';
import { out } from './util.js';

ui.drawer();

// report the drawer's state, so the demo shows what the class toggle does
const panel = ui.el('#demoDrawer');
if (panel) {
  const report = () => out('drawerOut', panel.classList.contains('open') ? 'open' : 'closed');
  new MutationObserver(report).observe(panel, { attributes: true, attributeFilter: ['class'] });
  report();
}

ui.on(ui.el('#topbarTheme'), 'click', () => ui.toggleTheme());
