// ge2-plugins/text-editor/config.js — the plugin's settings.
//
// Edit here to configure the plugin everywhere, or override per project from
// the `textEditor` key in js/ge2/config.js, or per element with
// data-textpath / data-mediapath. Narrowest wins.

import { config as ge2 } from '../../js/ge2/config.js';

export const config = {
  // Rendering libraries, loaded on first use so a page with no editor
  // fetches nothing. Pinned; both ship ESM builds, no build step needed.
  markdownUrl:  'https://cdn.jsdelivr.net/npm/marked@15.0.7/lib/marked.esm.js',
  sanitizerUrl: 'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.es.mjs',

  // Base subfolder inside uploads/media and uploads/text. An element's
  // data-mediapath / data-textpath is APPENDED to these, not substituted:
  // 'media1' here plus data-mediapath="demo" gives 'media1/demo'.
  // Empty means the uploads root itself.
  //
  // The storage ROOT is not settable from here on purpose — it lives in the
  // PHP, so a browser can never talk the server into writing elsewhere.
  mediaPath: '',
  textPath:  '',

  // Endpoints, resolved from this file's own location so they work from a
  // page at any depth. Point elsewhere only if you move the php/ folder.
  uploadUrl: new URL('./php/upload.php', import.meta.url).pathname,
  saveUrl:   new URL('./php/save.php', import.meta.url).pathname,

  // Project-level overrides win over everything above.
  ...(ge2.plugins?.['text-editor'] ?? {}),
};

export default config;
