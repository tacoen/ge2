// js/ge2/config.js — the one file in js/ge2/ meant to be edited per project.

export const config = {
  // Starting theme when nothing is stored: 'auto' (follow the OS), 'light'
  // or 'dark'. A theme the user picked is remembered and always wins.
  theme: 'auto',

  // Change this when several ge2 projects share an origin — localStorage is
  // per-origin, not per-directory, so they would share one theme.
  themeStorageKey: 'theme',

  // ── plugins ──────────────────────────────────────────
  // One key per plugin, named after its folder in ge2-plugins/. The key
  // being present is what loads it — comment one out and js/ge2/plugins.js
  // never fetches its JS or CSS. The value is that plugin's settings.
  plugins: {
    'text-editor': {
      // Base folders inside the plugin's uploads/. An element's
      // data-textpath / data-mediapath is appended, not substituted:
      //   textPath 'media1' + data-textpath="demo"  -> media1/demo
      //   textPath 'media1' + no attribute          -> media1
      //   no textPath       + data-textpath="demo"  -> demo
      //   neither                                   -> the uploads root
      textPath:  '',
      mediaPath: '',
    },
  },
};

export default config;
