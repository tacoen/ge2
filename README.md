# ge

A small front-end framework with no build step. Plain PHP or static HTML,
CSS organised with `@layer`, JS as ES modules — every file is served as-is.
Copy the starters, link one stylesheet and one script, and a page has
tokens, themes, element defaults, components and utilities.

## What it gives you

| Part | Files | |
|---|---|---|
| Tokens | `css/ge2/vars.css` | spacing, type scale, element typography, radius, motion, z-index, icons — and a colour system mixed from five seeds, light and dark |
| Element defaults | `css/ge2/base.css` | reset, body / headings / `pre` / `blockquote` / forms, all read from tokens |
| **Components** | **`css/ge2/ui.css`** + `js/ge2/ui.js` | **see below** |
| Layout | `css/ge2/layout.css` | topbar, hero, layout + sidemenu, drawer, dashboard cards |
| Utilities | `css/ge2/utils.css` | flex, padding, widths (with responsive variants), button styles and tones |
| Icons | `js/ge2/icons.js` | `<span data-icon="search">` hydrated to inline SVG |
| Storage | `js/ge2/store.js` | `localStorage` that never throws (private windows) |
| Plugins | `ge2-plugins/<name>/` | drop-in folders, switched on by one key in `js/ge2/config.js` |

### Layers

`style.css` declares the order once, before its imports:

```css
@layer units, base, ui, plugin, page, utils;
```

`units` (tokens) → `base` (elements) → `ui` (components, layout) → `plugin`
→ `page` (your app) → `utils` (always wins). Your page rules beat every
component without fighting specificity, and a utility class beats both.

### Theme

`data-theme="light|dark"` on `<html>`, applied by `ui.js` on import, before
first paint. `ui.setTheme()`, `ui.toggleTheme()`, `ui.getTheme()`; the
choice is remembered. Each theme sets only its seeds (`--bg`, `--fg`,
`--gray`, `--seed-*`); every other colour is derived with `color-mix()`.

## ui.css — the components

`css/ge2/ui.css` styles the markup `js/ge2/ui.js` drives. Two rules hold
throughout:

- **Tokens only.** Every size, colour, radius, shadow and duration is a
  `var(--…)` from `vars.css` — retheme by changing tokens, not selectors.
- **Zero specificity.** Every selector is wrapped in `:where()`. The `ui`
  layer already beats `base`, so a plain `.modal { … }` in your `page`
  layer overrides any of it — no `!important`, no selector arms race.

| Component | Markup | JS |
|---|---|---|
| Icons | `.icx` (made by `icons.js`), `.icx-sm`, `.icx-lg` | `icx.observe()` |
| Modal | `.modal#id`, wrapped in a shared `.overlay` on open | `ui.modal('open', id)` — traps focus, restores it on close |
| Toast | `.toast-container` > `.toast.toast-{info,success,error,warning}` | `ui.toast(msg, type, ms)` |
| Accordion | `.accordion` > `.accordion-item` > `.accordion-header` + `.accordion-content`; `data-single` for one-open | `ui.accordion()` |
| Dropdown | `.dropdown` > `.dropdown-toggle` + `.dropdown-menu` | `ui.dropdown()` |
| Context menu | `[data-contextmenu="id"]` → `ul.contextmenu#id` | `ui.contextmenu()` |
| Sidebar | `nav.sidebar` > `.sidebar-toggle` + `ul.sidebar-nav`; nested `<ul>` = foldable group | `ui.sidebar()` — scrollspy, collapses on phones |
| Tabs | `ul.tabmenu[data-scope]` > `li[data-tab]` → `.tab#id` panels | `ui.tabs()` |

State is a class `ui.js` toggles — `.active` (modal, overlay, accordion
item, tab, sidebar link), `.open` (sidebar group), `.collapsed` (sidebar) —
so a page can restyle each state the same way it restyles the component.

```html
<div class="dropdown">
  <button class="dropdown-toggle" type="button">Actions</button>
  <ul class="dropdown-menu"><li><button type="button">Rename</button></li></ul>
</div>
```

```css
@layer page {
  .dropdown-menu { border-radius: var(--radius-lg); }   /* wins over ui.css */
}
```

Full markup contracts: `js/ge2/readme.md`. API reference: `ge2/function.md`.

## Quick start

1. Make a sibling folder and copy the starters in:

   ```sh
   cp ge2/boiler.html                 myapp/index.html
   cp ge2/style.css ge2/script.js     myapp/
   cp ge2/boiler-vars-overrides.css   myapp/css/vars-overrides.css
   cp -r ge2/css/ge2                  myapp/css/
   cp -r ge2/js/ge2                   myapp/js/
   cp ge2/boiler-config.js            myapp/js/ge2/config.js   # no plugins enabled
   cp ge2/favicon.ico                 myapp/
   cp ge2/boiler-CLAUDE.md            myapp/CLAUDE.md          # rules for AI assistants
   ```

   `css/ge2/` and `js/ge2/` are a vendored copy — never edit them; pull
   upstream changes with `../sync-ge2.sh`.
2. Tune colours and type on the demo's **Token** page (`ge2/token.html`) and
   download `vars-overrides.css` over yours.
3. Put app rules in `@layer page`, app utilities in `@layer utils`.

## The demo

`ge2/index.html` — one page per group (Theme, Token, Component, Forms, Utils,
icons, Layout, Plugins), sharing a sidebar built from `ge2/menu.json`. The
Token page edits tokens live, saves named buckets, and exports the overrides.

## Checks

`./ge2-check.sh [project…]` — read-only conformance check (layer order,
framework boundary, plugin shape, relative paths, pinned CDNs, no inline JS,
no raw `localStorage`, no hardcoded colours). `ge2-pre-commit.sh` runs it as
a git hook.

## More

- `css/ge2/readme.md` — CSS internals, token tables, layer rationale
- `css/ge2/color.md` — how the colour system is derived
- `js/ge2/readme.md` — JS internals and markup contracts
- `ge2/function.md` — API reference
- `LICENSE` — licence and third-party notices
