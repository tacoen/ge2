// js/ge2/plugins.js — loads the plugins listed in config.js.
//
//   import { loadPlugins } from './ge2/plugins.js';
//   await loadPlugins();
//
// One key per plugin under `config.plugins`; the key is the folder name in
// ge2-plugins/. Presence enables it — comment a key out and that plugin is
// never fetched. The value is handed to the plugin as its settings.
//
// Core still knows nothing about any particular plugin: it only reads the
// list, resolves paths from its own location, and calls the agreed hook.

import { config } from './config.js';

const BASE = new URL('../../ge2-plugins/', import.meta.url);

/**
 * @param {string[]} [names] override the config list (mostly for tests)
 * @returns {Promise<Record<string, object>>} the loaded modules, by name
 */
export async function loadPlugins(names = Object.keys(config.plugins ?? {})) {
  const loaded = {};

  for (const name of names) {
    try {
      // Import first: a missing plugin should leave nothing behind, and
      // injecting the stylesheet up front would strand a <style> pointing at
      // a 404.
      const mod = await import(new URL(`${name}/js/${name}.js`, BASE).href);

      // A <link> cannot be given a cascade layer, but an @import can — so the
      // stylesheet goes in as a one-line @import instead. `plugin` is already
      // declared in style.css, so arriving late does not move it.
      if (!document.querySelector(`style[data-ge2-plugin="${name}"]`)) {
        const href = new URL(`${name}/css/${name}.css`, BASE).pathname;
        const style = document.createElement('style');
        style.dataset.ge2Plugin = name;
        style.textContent = `@import url('${href}') layer(plugin);`;
        document.head.appendChild(style);
      }

      await mod.init?.(config.plugins?.[name] ?? {});
      loaded[name] = mod;
    } catch (e) {
      // One broken plugin must not take the page down with it.
      console.error(`[ge2] plugin "${name}" failed to load`, e);
    }
  }

  return loaded;
}

export default loadPlugins;
