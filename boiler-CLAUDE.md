# CLAUDE.md — <app>

Lean by design. Add sections only as new rules are actually needed — don't pre-scaffold.

## Overview
<one line: what this app does>. Built on ge2: PHP or static HTML, CSS via
`@layer`, JS as ES modules. No build step — files are served as-is.

## ge is vendored — never edit it
- `css/ge2/` and `js/ge2/` are a synced copy of upstream (`../ge2`). Never
  edit them; `../sync-ge2.sh` overwrites them with `--delete`
- Project-owned, never synced: `js/ge2/config.js`, `js/ge2/icons-list.js`,
  `css/vars-overrides.css`, and anything listed in `.ge2-sync-exclude`
- Need a framework change? Write `ge2-suggestions/YYYY-MM-DD-topic.md`
  (what, why, diff against upstream) and stop. It is reviewed upstream
- Before writing new CSS or JS, check what ge already has:
  `css/ge2/readme.md`, `js/ge2/readme.md`, `js/ge2/icons.md`,
  `css/ge2/vars.css`. The function reference is `../ge2/ge2/function.md`
  (read-only)

## Root Files
- `index.php` or `index.html` (pick one)
- `style.css` → declares layer order, imports `css/ge2/*`, holds app-wide rules
- `script.js` → root ES module; rest in `js/`
- Paths always relative. No hardcoded host/domain. CDN deps OK (pin versions;
  keep the URLs in `js/ge2/config.js`)
- Server-side code: `php/` at the root, `<name>/php/` for a module. Storage
  roots live in the PHP, never in the request. No endpoint authenticates —
  gate them yourself

## CSS
- Layer order, declared in `style.css` **before** the imports:
  `@layer units, base, ui, plugin, page, utils;` — never change or redeclare it
- App code goes in `page`; app-wide utilities in `utils`. Never write into
  `units`, `base`, `ui` or `plugin` — those belong to ge and plugins
- A module sheet starts with `@import url('../style.css');` then
  `@layer page { … }`. It never re-imports ge
- Import syntax: `@import url('path') layer(name);`
- Tokens only: `var(--token-name)`, no hardcoded colours. Check
  `css/ge2/vars.css` first; palette changes go in `css/vars-overrides.css`

## JS
- ES modules only. No inline `<script>` / `onclick=`
- `localStorage` only via `js/ge2/store.js`
- Use ge's `ui` / `icx` helpers (`js/ge2/readme.md`) before writing your own
- Plugins: copy `../ge2/ge2-plugins/<name>/` in, add its key to
  `config.plugins`, configure it there. Don't edit plugin code — suggest
  changes upstream like a framework change

## Module Layout
Each module `<name>`:

| Path | Contents |
|---|---|
| `<name>/` | entry (`index.php`/`.html`) + subpages; other PHP → `<name>/php/` |
| `css/<name>.css` | imports `../style.css`, then its own `@layer page` rules |
| `css/<name>/` | extra CSS, only when it needs more than one file |
| `js/<name>.js` | JS entry point |
| `js/<name>/` | JS submodules, imported by the entry |

### Modules
- (none yet)

## Rules for Claude
- Never edit `css/ge2/` or `js/ge2/` (except `config.js`, `icons-list.js`)
- Edit existing tokens/utilities before adding new files
- Minimal, scoped changes — flag over-engineering instead of adding abstraction
- Unsure where something belongs → ask, don't guess
- Before calling work done, have the user run `../ge2/ge2-check.sh <app>`
  (it exits 1 on any FAIL) and fix what it reports. In a git repo,
  `ln -s /var/www/dash/ge2/ge2-pre-commit.sh .git/hooks/pre-commit` runs
  it on every commit
