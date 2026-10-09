# js/ge2/ — framework internals

Framework-only code. Nothing here is app/page-specific — see `CLAUDE.md` at the repo root for the boundary rule.

Version `0.1.0` — `VERSION` in `ui.js`, `--ge2-version` in `css/ge2/vars.css`.
A test fails if the two drift. Licensing and the Hugeicons notice: `/LICENSE`.

## plugins.js

Loads what `config.plugins` lists.

```js
import { loadPlugins } from './ge2/plugins.js';
await loadPlugins();          // -> { 'text-editor': Module, … }
```

One key per plugin, named after its folder in `ge2-plugins/`. **The key being
present is what loads it** — comment it out and neither the JS nor the CSS is
fetched. The value is passed to the plugin's `init(settings)`.

Stylesheets are injected as `@import url(…) layer(plugin)` inside a `<style>`
rather than as a `<link>`, because a `<link>` cannot be given a cascade
layer. `plugin` is declared up front in `style.css`, so arriving late does
not move it in the order.

A plugin that throws is logged and skipped, never fatal to the page. Core
names no plugin anywhere — it only reads the list.

## store.js

localStorage that cannot throw.

```js
import { store } from './ge2/store.js';
store.get(key, fallback)      store.set(key, value)      // -> boolean
store.getJSON(key, fallback)  store.setJSON(key, value)
store.remove(key)             store.available            // -> boolean
```

Access raises in a private window, with site data blocked, and in some
sandboxed frames — and an unguarded call takes the caller's whole `try` block
with it. Every method here degrades to the fallback instead, so a page that
cannot remember things still works.

**It is the only place in ge2 that touches `localStorage`**; a test fails if
another module reaches for it directly. Two bugs came from the raw access it
replaced: a failed write reported *"Failed to set theme"* even though the
theme had been applied, and an unreadable read skipped the `config.theme`
fallback, leaving the page with no `data-theme` at all.

## config.js

The one file here meant to be edited per project.

```js
export const config = {
  theme: 'auto',            // 'auto' | 'light' | 'dark' — used when nothing is stored
  themeStorageKey: 'theme', // localStorage key the chosen theme is remembered under
};
```

`ui.js` reads it on import. A theme the user picked (`ui.setTheme` /
`ui.toggleTheme`) is remembered and always beats `config.theme`; `'auto'`
defers to `prefers-color-scheme`.

Change `themeStorageKey` when several ge2 projects share one origin —
localStorage is per-origin, not per-directory, so they would otherwise share
a theme.

## ui.js

UI helpers, exported as `ui` (and as the default). Ported from the ge project's `js/geui.js`.

```js
import { ui } from './ge2/ui.js';
```

Importing the module applies the stored/preferred theme immediately (so the page
never flashes the wrong palette). Nothing else auto-runs — wire the rest yourself.

| Group | API |
|---|---|
| DOM | `el(sel, root?)` `els(sel, root?)` `show` `hide` `toggle` `addClass` `removeClass` `toggleClass` `on` `off` |
| Theme | `initTheme()` `setTheme('light'\|'dark')` `getTheme()` `toggleTheme()` |
| Toast | `toast(msg, type?, duration?)` — `info` \| `success` \| `error` \| `warning`; `error(msg, err?)` logs + toasts |
| Copy | `copy(btn, target, { success?, duration? })` — `execCommand`, works on plain http:// |
| Keys | `onKey('Ctrl+K', fn, { target?, preventDefault? })` → returns an **unbind** function |
| Form | `prepareForm(form)` `handleForm(form, onSuccess)` |
| Tabs | `tabs(selector = '.tabmenu')` |
| Accordion | `accordion(selector = '.accordion')` |
| Modal | `modal('open'\|'close'\|'destroy', id)` `trapFocus` `releaseFocus` `createOverlay` |
| Sidebar | `sidebar(target = '.sidebar', { collapseOn })` — selector **or** element |
| Drawer | `drawer(selector = '.drawer')` — off-canvas panel |
| Dropdown | `dropdown(selector = '.dropdown')` |
| Context menu | `contextmenu(selector = '.contextmenu')` — right-click |

### Markup contracts

```html
<!-- tabs -->
<ul class="tabmenu" data-scope="panels">
  <li data-tab="one" class="active">One</li>
</ul>
<div id="panels"><section class="tab" id="one">…</section></div>

<!-- accordion; data-single = only one open at a time -->
<div class="accordion" data-single>
  <div class="accordion-item">
    <div class="accordion-header">Title</div>
    <div class="accordion-content">…</div>
  </div>
</div>

<!-- modal: moved into .overlay on open -->
<div class="modal" id="demoModal">…</div>

<!-- dropdown -->
<div class="dropdown">
  <button class="dropdown-toggle" type="button">Actions</button>
  <ul class="dropdown-menu"><li><button type="button">Rename</button></li></ul>
</div>

<!-- context menu: right-click the host, the menu opens at the pointer -->
<div data-contextmenu="fileMenu">right-click me</div>
<ul class="contextmenu" id="fileMenu"><li><button type="button">Open</button></li></ul>

<!-- drawer: any [data-drawer="id"] toggles it; the scrim and Escape close it -->
<button data-drawer="nav">open</button>
<div class="drawer-scrim" data-drawer-for="nav"></div>
<aside class="drawer" id="nav">…</aside>

<!-- sidebar: an <li> holding a nested <ul> becomes a collapsible group -->
<nav class="sidebar">
  <button class="sidebar-toggle" type="button">menu</button>
  <ul class="sidebar-nav">
    <li><a href="#tokens">Token</a>
      <ul><li><a href="#toast">Toast</a></li></ul></li>
  </ul>
</nav>
```

Both menus close on an outside pointerdown, on Escape, and when an item is
chosen — the click itself stays yours to handle. The context menu suppresses
the browser's own menu and is clamped so it never opens off-screen. Neither
traps focus; for that use `modal()`.

An `<li>` with no nested `<ul>` stays a plain link — useful for a Home entry.

`sidebar()` collapses the whole rail via `.sidebar-toggle`, folds each group,
and marks the link whose section is on screen (`.active`) with an
IntersectionObserver, opening that link's group. Anchors stay real links, so
ctrl/middle-click and a JS-off page still work; below `collapseOn` (575.98px
by default) following one closes the rail. The page owns where the rail sits
— see `css/ge-maker.css`.

`ui.js` ships no CSS of its own — the classes it sets are styled by
`css/ge2/ui.css`, on tokens from `css/ge2/vars.css`, with element defaults in
`css/ge2/base.css`. See `css/ge2/readme.md`.

### Changed from `geui.js`

- Class renamed `geUIHelper` → `GeUI`, exported as `ui` / default.
- Starting theme moved to `config.js`, and the stored value is now validated:
  a corrupt one (`localStorage.theme = 'banana'`) used to be passed to
  `setTheme`, which silently ignored it and left the page with **no**
  `data-theme` at all. It now falls back to `config.theme`.
- The `static {}` block's `initGlobalKeys()` demo shortcuts (a Ctrl+K toast, a global
  Escape) were app code in a framework file — dropped. Escape-closes-modal now lives
  in `trapFocus`, where it belongs; the Ctrl+K demo moved to `js/ge-maker.js`.
- **Focus-trap leak fixed**: `trapFocus` bound its handler to the modal but
  `releaseFocus` removed it from `document`, so every open stacked another listener.
  Both now use `document`, and `trapFocus` releases any previous trap first.
- `onKey` matches the full modifier set exactly (so `Escape` no longer fires while
  Ctrl is held) and returns an unbind function instead of the raw handler.
- `getCurrentTheme()` → `getTheme()`; added `toggleTheme()` and `off()`.
- Id lookups go through `CSS.escape`; tab/accordion `switch` cases are block-scoped.
- **Form named-getter bug fixed**: `HTMLFormElement`'s named getter is
  `[LegacyOverrideBuiltIns]`, so a control called `name` shadows `form.name` and
  returns *the element*. `prepareForm` interpolated that into every generated id
  (`[object HTMLInputElement]-email`). It now reads `getAttribute('name')` /
  `getAttribute('id')`, and `handleForm` calls `checkValidity`/`reportValidity`/
  `reset` off the prototype so a control named `reset` cannot shadow them.

## icons.js / icons-list.js

The data lives in `icons-list.js` (`export const ICONS`, ~29 KB of path
data); `icons.js` is the wrapper and exports `icx`. The Hugeicons attribution
sits in both `icons-list.js` and `/LICENSE`, since that is the file carrying
the licensed content.


Icon hydration utility, exported as `icx` — 42 Hugeicons (Stroke Rounded, MIT) as
inline SVG strings. No network request, no font file, no build step.

```js
import { icx } from './ge2/icons.js';

icx.svg('search', { size: 20, strokeWidth: 2, class: 'my-icon' }); // -> <svg> string
icx.hydrate(root?);   // hydrate [data-icon] under root (default: document), once
icx.observe(root?);   // hydrate now + watch for [data-icon] added later -> MutationObserver
icx.has('search');    // -> true
icx.names;            // -> string[]
```

```html
<span data-icon="search"></span>
<span data-icon="trash" data-icon-size="16" data-icon-stroke="2"></span>
```

Hydrated nodes are marked `data-icx-done`, so repeat `hydrate()` calls are cheap and
idempotent. An unknown name warns to the console and renders nothing.

Full API notes, page-side usage and the icon list: `icons.md`. Reference
grid: the icons section of `ge2/index.html`.
