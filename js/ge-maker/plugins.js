// js/ge-maker/plugins.js — loads whatever js/ge2/config.js lists.

import { ui } from '../ge2/ui.js';
import { loadPlugins } from '../ge2/plugins.js';
import { out } from './util.js';

// ── plugins ───────────────────────────────────────────
// Whatever js/ge2/config.js lists. The editor mounts itself; the harness
// listens for its events rather than passing callbacks, so the loader stays
// in charge of initialisation.
ui.on(document, 'tex:save', (e) => {
  const { source, file } = e.detail;
  out('editorOut', file ? `saved ${source.length} chars -> ${file}`
                        : `${source.length} chars (not persisted)`);
});
ui.on(document, 'tex:error', (e) =>
  ui.toast(`Editor: ${e.detail.error.message}`, 'error'));

await loadPlugins();
