# ge-maker

The harness that ships with ge. It is not part of the framework — nothing in
`css/ge2/` or `js/ge2/` knows it exists — but it is where you *make* things:
tune the palette, author icons, and take a real file away at the end.

Two entry points, mirroring the framework's own shape:

| Path | |
|---|---|
| `css/ge-maker.css` | page styles; imports `../style.css` for tokens and layer order |
| `js/ge-maker.js` | bootstrap, shared sidebar, then the one module the page needs |
| `js/ge-maker/*.js` | one module per page, named by `<body data-page="…">` |
| `ge2/*.html` | the pages |
| `ge2/menu.json` | the sidebar — and the home page's landing grid — in one place |

**Starting a new app?** That is not here: the root
[quick start](../index.html) walks through it — the copy commands, the
`boiler-*` starter files, syncing, config, CSS, JS, modules and plugins. It
is linked from the sidebar, with the starter files listed under it.

---

## What it produces

Two of the pages are authoring tools, not demos. Both keep their work in
`localStorage` and hand you a finished file to drop into `js/ge2/` or
`css/ge2/`.

### A palette → `vars.css`

**Theme** holds the theme switch and the colour editor: `--ac`, `--bg`, `--fg` and the five
component seeds (`--seed-pr` … `--seed-in`). Type any CSS colour, not just
hex: a keyword, a `color-mix()`, a `var()`. An edit is a real override on
`<html>`, so the whole page follows it, and the `--ac` scale and three demos
— an app dashboard, a webpage, a docs article — show it on something that
looks like a product rather than on a strip of colour.

Overrides are kept **per theme**, because `vars.css` scopes those tokens to
its `[data-theme]` blocks. Switching theme swaps them in rather than clearing
them, and the export writes both. They are applied on every demo page
(`js/ge-maker/overrides.js`, loaded by `js/ge-maker.js`), so the rest of the
demo is a further preview.

Further down the same page, on the same overrides:

**Typography** sets font, size, weight and colour for body text, `h1`–`h6`
`small`, `pre` and `blockquote`. Every option is a token (`var(--font-serif)`, `var(--text-lg)`,
`var(--w-medium)`, `var(--pr)`…), written onto the element's own token
— `--body-font`, `--h1-weight`, `--small-color` — which `base.css` reads.
These are theme-neutral, so they export into the plain `:root` block.

- **buckets** — save the current state under a name, reload it, delete it
- **download vars-overrides.css** — the overrides shown in the preview box,
  ready to drop in as an app's `css/vars-overrides.css`

### An icon set → `icons-list.js`

**icons** shows the whole set at a size, stroke width and colour you can
drag. Beyond that it is an editor: every tile has an edit button, the last
tile adds one, and **export icons-list.js** downloads a complete module.

Paste a whole `<svg>` or just its contents — the wrapper is stripped, since
`icons-list.js` stores the body only and `icx.svg()` supplies the element,
the `viewBox` and the token-driven geometry.

---

## What it demonstrates

| Page | |
|---|---|
| **Home** | this file and the [function reference](function.md), rendered from markdown |
| **Theme** | `setTheme` / `toggleTheme` and the `data-theme` readout; the colour editor (`--ac`, `--bg`, `--fg`, the five seeds), the `--ac` scale, and a dashboard, webpage and docs article painted from them; the type scale, element typography, buckets |
| **Component** | toast, tabs, accordion, modal, copy, onKey, dropdown, context menu |
| **Forms** | `prepareForm` / `handleForm` — generated ids, wired labels, validation |
| **Utils** | the flex and responsive utilities from `css/ge2/utils.css` |
| **icons** | `icx.svg()`, `[data-icon]` hydration, and the editor above |
| **Layout** | topbar, hero, drawer, sidemenu, dashboard |
| **Plugins** | whatever `config.plugins` lists — the markdown text editor by default |

---

## How a page is put together

```html
<body data-page="token">
<div class="shell">
  <nav class="sidebar" id="siteNav"></nav>   <!-- built from menu.json -->
  <div class="page"> … </div>
</div>
<script type="module" src="../js/ge-maker.js"></script>
```

`js/ge-maker.js` does the same three framework calls as the root
`script.js` — `icx.observe()`, `ui.tabs()`, `ui.accordion()` — builds the
sidebar, folds the notes away, then imports `./ge-maker/<data-page>.js`.

The sidebar carries a theme button beside its menu toggle. It fires a
cancelable `ge-maker:theme` event on `document` and toggles the theme only
if no one cancels it. `js/ge-maker/overrides.js`, loaded on every page,
cancels it and switches the theme itself, so the overrides kept for each
theme swap along with it.

**Adding a section** is a `menu.json` edit, not an edit to seven HTML files.
The sidebar and the cards on `index.html` are both built from it. An item
links to `page#anchor`, or straight to a file when it has an `href` instead
of an `anchor` — that is how the quick start's starter files are listed. A
group whose page sits outside `ge2/` (`../index.html`) gets no card.

**Explanatory prose** is `<p class="out" data-note>`. `hints.js` turns it into
a popover behind an icon on the heading, so the demo is what you see and the
description is one click away. An `.out` that JS writes into is a readout —
it gets no `data-note` and stays on screen.

---

## Removing it

Delete `ge2/`, `css/ge-maker.css`, `js/ge-maker.js` and `js/ge-maker/`.
Nothing in `css/ge2/`, `js/ge2/` or `ge2-plugins/` refers to any of them, so
the framework and its plugins keep working. The root quick start links to
`ge2/index.html` from its topbar and hero — drop those links too.
