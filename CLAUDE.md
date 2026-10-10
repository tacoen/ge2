# CLAUDE.md — ge2

Lean by design. Add sections only as new rules are actually needed — don't pre-scaffold.

## Overview
Front-end framework/project. PHP or static HTML, CSS via `@layer`, JS as ES modules. No build step — files are served as-is.

## Root Files
- `index.php` or `index.html` (pick one)
- `style.css` → root stylesheet: declares layer order, imports `css/ge2/*`, holds app-wide rules; rest in `css/`
- `script.js` → root ES module; rest in `js/`
- `boiler.html`, `boiler-config.js`, `boiler-vars-overrides.css`,
  `favicon.ico` → starters a new app copies (see the quick start in
  `index.html`). `boiler-config.js` is `js/ge2/config.js` with no plugins
  enabled — change one, change the other
- `boiler-CLAUDE.md` → a new app's `CLAUDE.md`: the subset of these rules
  that applies downstream. A rule change here that affects apps goes there too
- `ge2-check.sh` → read-only check of ge2 and every synced project (drift,
  strict layer order, one root entry, module sheet wiring, framework
  boundary, plugin shape and paths, request data in filesystem calls,
  root-absolute paths, CDN URLs outside `config.js`
  or unpinned, inline JS, raw `localStorage`, hardcoded colours).
  Run `./ge2-check.sh [project…]`; exits 1 on any FAIL. A rule added to
  this file that can be checked mechanically belongs in it too
- `ge2-pre-commit.sh` → git pre-commit hook that runs `ge2-check.sh` on
  its own repo and blocks on FAIL. Installed here as a symlink in
  `.git/hooks/`; the install line for an app is in the script
- Paths always relative. No hardcoded host/domain. CDN deps OK (pin versions;
  keep the URLs in `js/ge2/config.js`, not scattered through the code)
- Server-side code: `php/` at the root, `<name>/php/` for a module,
  `ge2-plugins/<name>/php/` for a plugin. A plugin stores what it writes in
  its own `uploads/`, behind an `.htaccess` that disables execution. Storage
  roots live in the PHP, never in the request. No endpoint authenticates —
  gate them yourself

### Plugins
Drop-in components that are not framework and not page. One folder each,
`ge2-plugins/<name>/`, holding everything it needs:

| Path | |
|---|---|
| `ge2-plugins/<name>/readme.md` | what it is and how to install it |
| `ge2-plugins/<name>/config.js` | its settings |
| `ge2-plugins/<name>/js/`, `css/`, `php/` | its code |
| `ge2-plugins/<name>/uploads/` | anything it writes, with an exec-disabling `.htaccess` |

Copy the folder in and add one key to `config.plugins` — `js/ge2/plugins.js`
imports the JS and injects the CSS into layer `plugin`, between `ui` and
`page`. Comment the key out and nothing is fetched; delete the folder and
nothing else breaks. A plugin exports `init(settings)` for the loader to
call, and writes only inside its own folder, never `[root]/media` — that is
what keeps it distributable.

Settings go in `js/ge2/config.js` under one namespaced key per plugin, so a
project has a single place to configure everything. The key is optional: a
plugin ships working defaults and falls back to them when it is absent. The
dependency runs one way — a plugin may read core config, core never reads a
plugin.
- `text-editor` — markdown view/editor; see `ge2-plugins/text-editor/readme.md`

## CSS
- `css/ge2/*.css` = framework. It owns `units`, `base` and `ui`; the app
  owns `page`; `utils` is shared. One layer per concern:
  `units` (vars + vars-overrides) → `base` (base) → `ui` (ui + layout)
  → `plugin` → `page` → `utils` (utilities, last)
- App/page code goes in `page` (or `app`), between `plugin` and `utils`;
  app-wide utilities go in `utils`, after ge2's own
- `style.css` is the single wiring point: it declares layer order and imports
  `css/ge2/*`. A module sheet just does `@import url('../style.css');` — it
  never re-imports ge2 and never redeclares the layer order
- Layer order: `@layer units, base, ui, plugin, page, utils;` **before** the
  imports in `style.css` — declared after, `page` lands last and beats the utilities
- Each boundary is deliberate: `ui` overrides element defaults (its
  `:where()` selectors depend on it), `page` customises components, `utils`
  always wins
- Flat names, not nested layers. `base.ui` / `base.util` would sit *inside*
  the `base` slot, and utilities would land before `page` — the opposite
- Import syntax: `@import url('path') layer(name);` (not `@layer 'x' import`)
- Tokens only: `var(--token-name)` — check `css/ge2/vars.css` before inventing one
- `css/ge2/` internals → see its `readme.md`

## JS
- ES modules only. No inline `<script>` / `onclick=`.
- `localStorage` only via `js/ge2/store.js` — raw access throws in a private
  window and takes the caller's `try` block with it
- `js/ge2/` = framework only, no app/page code. The one exception is
  `js/ge2/config.js` — framework settings (starting theme, storage key) meant
  to be edited per project
- `js/ge2/` internals → see its `readme.md`

## Module Layout
Each module `<name>` (e.g. `fm`):

| Path | Contents |
|---|---|
| `<name>/` | entry (`index.php`/`.html`) + subpages; other PHP → `<name>/php/` |
| `css/<name>.css` | module's CSS entry point — imports `../style.css`, then its own `@layer page` rules |
| `css/<name>/` | module's extra CSS, imported by the entry (only when it needs more than one file) |
| `js/<name>.js` | module's JS entry point |
| `js/<name>/` | module's JS submodules, imported by the entry |
| `<name>/readme.md` | `<name>` internals |

CSS and JS mirror each other: one entry file beside an optional folder. The CSS entry exists because the `<link>` target has to pull in the framework before its own rules; it does that by importing `style.css`, which owns the layer order. A module with one stylesheet is just `css/<name>.css`, no folder. Keep this shape for every new module.

### Modules
- `fm` — file manager: `css/fm.css` → `css/fm/{style,gallery}.css`, `js/fm.js` → `js/fm/{list,gallery}.js`
- `ge2` demo — the framework's own harness, split one page per group:
  `ge2/{index,token,component,basic,icons,layout,plugins}.html` (+ its `favicon.ico`),
  `css/ge-maker.css`, `js/ge-maker.js` → `js/ge-maker/*.js`. The entry files keep
  the `ge-maker` name so they don't collide with `css/ge2/` and `js/ge2/`.
  The sidebar is shared: `ge2/menu.json` is the single source, built by
  `js/ge-maker/menu.js`, which also hands the file to `js/ge-maker/index.js`
  for the landing grid. Add a section there, not in seven HTML files.
  Each page names its demo module with `<body data-page="…">`
  Section prose is `<p class="out" data-note>` — `js/ge-maker/hints.js` folds
  it into a popover behind an icon on the heading. A `.out` that JS writes
  into is a readout, gets no `data-note`, and stays on screen.
  `ge2/ge-maker.md` documents the harness and `ge2/function.md` is the API
  reference for `js/ge2/`; `index.html` renders both via the text-editor
  plugin, falling back to the raw source when the plugin is absent. Edit the
  markdown, not the HTML

## Rules for Claude
- Never mix framework (`ge2/`) and app/page code
- Ask before editing any `css/ge2/*.css`, even for a one-line fix. Say which
  file, what changes, and why it can't go in `page` or `style.css`. Approval
  covers that one change only
- Edit existing tokens/utilities before adding new files
- Minimal, scoped changes — flag over-engineering instead of adding abstraction
- Unsure where something belongs → ask, don't guess

## Reviewing ge2-suggestions
Downstream projects keep a synced copy of `css/ge2/` and `js/ge2/` in their
own `css/ge2/` and `js/ge2/` and never edit it (`config.js` and
`icons-list.js` excepted — those are project-owned and never synced). When
they need a framework change they write
`../<project>/ge2-suggestions/YYYY-MM-DD-topic.md` (what, why, diff against
upstream). This folder is the only place those changes land.

- Find pending ones: `ls ../*/ge2-suggestions/*.md` (ignore `done/`).
- For each: read it, check the diff still applies to current upstream, and
  judge it against the Rules for Claude above (scope, tokens before new
  files, no app code in the framework). Present a verdict per file —
  accept / accept with changes / reject — with a one-line reason, and wait
  for approval before editing (the `css/ge2/*.css` ask-first rule still applies).
- Apply accepted changes here, in upstream `css/` / `js/` only. Never edit
  the downstream `css/ge2/` / `js/ge2/` copies; the user propagates with
  `../sync-ge2.sh`.
- Handled files (accepted or rejected) move to
  `../<project>/ge2-suggestions/done/`, with a short outcome note appended
  (`**Outcome (YYYY-MM-DD):** applied | applied with changes | rejected — why`).
  Sibling folders are write-protected for this project's Claude, so don't
  try to write there: print the exact `mkdir -p … && mv …` commands and the
  outcome text, and the user runs them (e.g. with `!`).
