# icons.js

Icon hydration utility, exported as `icx`. Bundles 42 curated icons from
**Hugeicons** (Stroke Rounded style, MIT License) as inline SVG strings — no
network requests, no font file, no build step.

## Source

| | |
|---|---|
| Project | <https://github.com/hugeicons> |
| Package | [`@hugeicons/core-free-icons`](https://github.com/hugeicons/hugeicons) — `packages/core-free-icons` |
| Browse | <https://hugeicons.com> (Stroke Rounded is the free tier) |
| Licence | MIT |

Path data is used as-is from that package and lives in `icons-list.js`;
`icons.js` only adds the hydration/render wrapper. The MIT notice is in
`/LICENSE` and must travel with both files.

## API

```js
import { icx } from './ge2/icons.js';

icx.svg('search', { size: 20, strokeWidth: 2, class: 'my-icon' }); // -> <svg> string
icx.hydrate(root?);   // hydrate [data-icon] under root (default: document), once
icx.observe(root?);   // hydrate now + watch for [data-icon] added later
icx.has('search');    // -> true
icx.names;            // -> array of all available icon names
```

Hydrated nodes are marked `data-icx-done`, so repeat `hydrate()` calls are
cheap and idempotent. An unknown name warns to the console and renders
nothing.

## Using it in a page

```js
import { icx } from './ge2/icons.js';

icx.observe();   // once per page
```

`icx.observe()` is only needed for `[data-icon]` markup — it hydrates what is
there now and watches for what arrives later. A page that builds its own
markup with `icx.svg()` needs no call at all. Use `icx.hydrate()` instead if
the page never inserts icons after load.

Two ways to place an icon:

```html
<!-- declarative: hydrated by observe() / hydrate() -->
<span data-icon="search"></span>
<span data-icon="trash" data-icon-size="16" data-icon-stroke="2"></span>
```

```js
// imperative: returns an <svg> string, nothing to hydrate
el.innerHTML = `${icx.svg('search')}<span>search</span>`;
```

## Sizing & colour

Never hard-code either. Every generated `<svg>` carries the `icx` class, and
`css/ge2/ui.css` sizes and strokes it from the `--icon-*` tokens in
`css/ge2/vars.css` — so restyling icons is a token change on any ancestor,
with no markup or JS edit:

```css
.toolbar { --icon-size: var(--icon-size-sm); --icon-stroke: var(--pr); }
```

`data-icon-size` / `data-icon-stroke`, and the `size` / `strokeWidth` opts of
`icx.svg()`, are emitted as inline custom properties, so a per-element
override still beats the token. `width`/`height` attributes remain on the
element as a fallback for pages that load `icons.js` without `ui.css`. See
`css/ge2/readme.md`.

## Available icons (42)

`home` `search` `close` `menu` `check` `plus` `minus` `chevron-left` `chevron-right` `chevron-up` `chevron-down` `arrow-left` `arrow-right` `settings` `user` `trash` `edit` `download` `upload` `copy` `external-link` `star` `heart` `info` `alert` `lock` `unlock` `calendar` `clock` `mail` `phone` `image` `file` `folder` `moon` `sun` `refresh` `filter` `grid` `list` `xray` `borobudur`

The icons section of `ge2/index.html` renders all of them, with live controls
for `--icon-size`, `--icon-stroke-width` and `--icon-stroke`, plus the
hydrate/observe behaviour.

## Adding an icon

1. Find the exact icon name in the [Hugeicons free set](https://hugeicons.com)
   (Stroke Rounded style only — that's the free tier).
2. Pull its path data from `@hugeicons/core-free-icons` (the `[tag, attrs]`
   array export) and convert attrs to kebab-case SVG attributes.
3. Add one entry to the `ICONS` object in `icons-list.js`, using the same
   short kebab-case key style as the existing set.
4. Add the name to the list above. `ge2/index.html` picks it up from
   `icx.names` automatically.

Don't hand-author new icon paths — only add icons that exist in the official
Hugeicons free package, so everything stays under the same MIT terms.

## Editing the set from the browser

`ge2/icons.html` has an **icons · add / edit** section: every tile carries an
edit button, the last tile adds one, and **export icons-list.js** downloads a
complete replacement for this file.

Paste a whole `<svg>` or just its contents — the wrapper is stripped, because
`icons-list.js` stores only the body and `icx.svg()` supplies the element,
the `viewBox` and the token-driven geometry. Names are lowercased and
hyphenated, since the key is both a quoted string in the file and a
`data-icon` value.

Edits live in `localStorage` and apply to the open page immediately; nothing
touches `js/ge2/` until you export and copy the file in. **reset to bundled**
throws the edits away.

Hugeicons path data is still not something to hand-author — the editor is for
adding your own marks and fixing mistakes.
