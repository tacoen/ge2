# css/ge2/ — framework internals

Framework-only CSS, adopted from the ge v1 project's `/vars.css`, `/base.css`
and `/utils.css`. ge owns `units`, `base` and `ui`; the app owns `page`; `utils` is
shared — ge's utilities first, then the app's.

No file declares a layer of its own — `/style.css` assigns them, and it is
the only place layer order is written. Every page reaches ge through it:
root pages link it directly, module sheets `@import url('../style.css');`
and add their own `@layer page` rules. Nested `@import` paths resolve
relative to the sheet that contains them, so ge is found correctly either
way.

```css
/* before the imports — see below */
@layer units, base, ui, plugin, page, utils;

@import url('css/ge2/vars.css')          layer(units);
@import url('css/vars-overrides.css')    layer(units);
@import url('css/ge2/base.css')          layer(base);
@import url('css/ge2/ui.css')            layer(ui);
@import url('css/ge2/layout.css')        layer(ui);
@import url('css/ge2/utils.css')         layer(utils);

@layer page  { /* … */ }
@layer utils { /* app-wide utilities, after ge's */ }
```

| Layer | Holds | Beats |
|---|---|---|
| `units` | tokens (`vars.css`, then `/css/vars-overrides.css`) | — |
| `base` | reset, element defaults | — |
| `ui` | framework components (`ui.css`, `layout.css`) | element defaults |
| `plugin` | drop-in plugin sheets | components |
| `page` | the app/page sheet | components (customisation) |
| `utils` | ge utilities, then app utilities | everything |

**The `@layer` statement has to come before the imports.** Layer order follows
first appearance: declared afterwards, the imported layers already hold the
early slots and the new `page` is appended *last* — beating the utilities,
the opposite of the intent. A `@layer` statement before `@import` is
explicitly allowed by CSS Cascade 5.

**Every layer is top-level — no nesting.** `@layer base.ui` would be a
sublayer occupying the single `base` slot. Utilities especially must be their
own top-level `utils` layer — imported into `base` they land before `page`
and stop winning (see "Why the layers are split").

`!important` inverts the order, so `[hidden] { display: none !important }` in
`base` still beats `.flex` in `utils` — which is what you want.

That block lives in `/style.css`. Working consumer: `css/ge-maker.css` — a single `@import` plus its own rules.

## vars.css

Every token. Adopted from ge v1 verbatim, plus the groups ge added, marked in the file.

| Group | Tokens |
|---|---|
| Base | `--white` `--black` `--shadow` |
| Spacing | `--vxs` `--xs` `--sm` `--md` `--lg` `--xlg` `--vlg` `--scroll-width` |
| Fonts | `--font-sans` `--font-mono` `--font-serif` |
| Palette | seeds `--bg` `--fg` `--gray` · direction `--tint` `--sink` · text `--muted` `--subtle` · surface `--bg-subtle` `--bg-muted` `--bg-inset` `--bg-overlay` · line `--border-muted` `--border` `--border-hover` |
| Functional | `--seed-ac` `--seed-pr` `--seed-sc` `--seed-da` `--seed-wr` `--seed-in` → `--ac` `--pr` `--sc` `--da` `--wr` `--in`. Each but `--ac` has `-bg` / `-subtle` / `-border` / `-bg-text`; `--ac` is its seed as is, with the scale `-bg1`…`-bg5` / `-fg1`…`-fg5` / `-tr1`…`-tr3` |
| ge · type | `--text-xs` `--text-sm` `--text-md` `--text-lg` `--text-xl` `--text-2xl` `--text-3xl` `--leading` `--leading-tight` `--w-medium` `--w-bold` `--tracking-wide` |
| ge · shape | `--radius-sm` `--radius-md` `--radius-lg` `--border-width` |
| ge · motion | `--dur-fast` `--dur` `--ease` |
| ge · focus | `--focus-width` `--focus-offset` `--focus-color` |
| ge · stacking | `--z-overlay` `--z-modal` `--z-toast` |
| ge · icon | `--icon-size` `--icon-size-sm` `--icon-size-lg` `--icon-stroke` `--icon-stroke-width` `--icon-fill` `--icon-linecap` `--icon-linejoin` |
| ge · components | `--modal-min-width` `--modal-max-width` `--toast-max-width` `--tab-indicator-width` |
| ge · breakpoints | `--bp-sm` `--bp-md` `--bp-lg` `--bp-xl` `--bp-xxl` (Bootstrap 5 scale; `xs` is 0, the unqualified base) |

Spacing tokens double as font sizes for controls (`font-size: var(--sm)`),
which is the ge v1 convention; `--text-*` covers running text.

Theming is `data-theme` on `<html>`, which `js/ge2/ui.js` writes on import.

How the colours are derived — the `--ac` scale, which step each neutral role
uses, the component tones, resolved values and contrast, and the known rough
edges: see [`color.md`](color.md).

### Changed while adopting

- **Light is now the default.** ge v1 keyed light only on `[data-theme='light']`,
  so a document without the attribute had no `--bg` / `--fg` at all. The light
  block is now `:root, [data-theme='light']`, with dark after it.
- **Seeds extracted.** The four functional colours hardcoded their seed inside
  the `color-mix()` call (`#66CCEE`, `green`, `red`, `yellow`), so the palette
  could not be retuned. They are now `--seed-pr` / `--seed-sc` / `--seed-da` /
  `--seed-wr`, same values, overridable on their own.
- **Accent joined the family.** `--blue` seeded `--link`, `--link-bg`,
  `--link-subtle`, `--link-border`, a set that sat apart from the four system
  colours for no reason but its name. It is now `--seed-ac` → `--ac`, with the
  same `-bg` / `-subtle` / `-border` / `-bg-text` variants as the rest. There is
  no `--link*` any more; anchors in `base.css` take `var(--ac)`.
- **Functional colours moved from `body` to `:root`.** They derive from `--fg`,
  which is declared on `<html>` — the same element as `:root` — so they resolve
  identically, but are now visible to `<html>` and to other `:root`-level
  tokens. `--focus-color: var(--pr)` needs this.
- **`--ac` moved to a scale.** `--ac` is now `--seed-ac` itself, no longer
  toned toward `--fg`, and its `-bg` / `-subtle` / `-border` / `-bg-text` are
  gone. In their place: `--ac-bg1`…`-bg5` (`--ac` with 15 / 30 / 45 / 60 / 85%
  `--bg`), `--ac-fg1`…`-fg5` (same toward `--fg`) and `--ac-tr1`…`-tr4` (25 /
  50 / 75 / 95% transparent). The `.ac` button maps rest → `bg5`, hover → `bg3`,
  border → `bg4`, text → `fg4`. Apps that used the old names must move.
- **`--bg-*` surfaces follow the `--ac` scale**, by the scale's role labels:
  `--bg-subtle` and `--bg-muted` → `--ac-bg5` (were `--bg` + 4 / 8% `--tint`),
  `--bg-inset` → `--ac-bg3` (was 40% `--sink`), `--bg-overlay` → `--ac-tr4`
  (was `--black` at 50%). Every surface now takes the accent's hue, and
  subtle and muted are the same colour.
- **Borders and focus follow the `--ac` scale too**, by label:
  `--border-muted` → `--ac-bg5`, `--border` → `--ac-bg4`, `--border-hover` →
  `--ac-bg3` (were `--bg` + 15 / 30 / 45% `--gray`), and `--focus-color` →
  `--ac-bg1` (was `--pr`).
- **Links take `--pr`.** `<a>` and `[type=submit]` in `base.css` and the
  neutral `.btn.link` in `utils.css` moved from `--ac` to `--pr`, so links read as the primary
  colour and stay apart from the accent-tinted surfaces and text.
- **Secondary text follows `--ac`.** `--muted` → `--ac-fg3` (label: text),
  `--subtle` → `--ac-fg2` (were `--fg` + 50 / 85% `--gray`). `--gray` now
  feeds nothing in ge.

## base.css

Element styles, adopted from ge v1's `/base.css` with literals swapped for
tokens. Reset, `html`/`body`, links, headings, media, code, form controls,
`:focus-visible`, `hr`, `table`, scrollbars.

Its "UI Components" block moved to `ui.css`, which is where ge keeps
component styling.

Two rules worth knowing, because they outrank zero-specificity selectors:
`[hidden] { display: none !important }` (so `.tab[hidden]` needs no rule of
its own) and `svg { display: block }` (see the icon note below).

## ui.css

Components `js/ge2/ui.js` drives, plus icon geometry.

`.icx` · `[data-icon]` · `.overlay` `.overlay.active` · `.modal` `.modal.active`
· `.toast-container` `.toast` `.toast-success|error|info|warning` ·
`.accordion` `.accordion-header` `.accordion-content` `.accordion-item.active`
· `.tabmenu > li` `.tabmenu > li.active` · `.sidebar` `.sidebar.collapsed`
`.sidebar-toggle` `.sidebar-nav` `.sidebar-group` `.sidebar-group.open`
`.sidebar-link` `.sidebar-link.current` `.sidebar-nav a.active` ·
`.dropdown` `.dropdown-toggle` `.dropdown-menu` · `.contextmenu` ·
`.menu-danger`

Overlay, modal, toast and accordion come from ge v1; tabs and icons are new in ge.
Most selectors are wrapped in `:where()` so page rules win on equal
specificity.

### Added while adopting

The `.overlay.active` / `.modal.active` rules. `ui.js` toggles both an inline
`display` and the `.active` class, but the ge v1 original defined only the hidden
state — so clearing the inline style fell back to `display: none` and the
modal never appeared. The shown display value has to live on `.active`.

### Icon sizing

`icons.js` tags every generated `<svg>` with `icx`. Geometry comes from
tokens, so resizing or recolouring icons is a token change on any ancestor —
no markup, no JS:

```css
.toolbar { --icon-size: var(--icon-size-sm); --icon-stroke: var(--pr); }
```

The `.icx` rule is deliberately **not** wrapped in `:where()`: base.css sets
`svg { display: block }`, and an element selector beats a zero-specificity
one, which would force every icon out of the text flow.

The stroke rules target the shapes rather than the `<svg>`, because the
bundled Hugeicons paths carry `stroke` / `stroke-width` as presentation
attributes, which beat a value inherited from the parent.

Per-element overrides (`data-icon-size`, `data-icon-stroke`, or `icx.svg()`
opts) are emitted as inline custom properties, so they still win over the
tokens. Icons also keep `width`/`height` attributes as a fallback for pages
that load `icons.js` without `ui.css`.

## utils.css

Adopted from the ge v1 project, content unchanged.

`.flex` plus modifiers (`row` `column` `top` `bottom` `middle` `base` `stretch`
`left` `right` `center` `between` `around` `evenly` `wrap` `nowrap`
`wrap-reverse` `grow` `shrink` `noshrink` `nobasis` `flex-1` `gap-1…8`),
padding `.p1`–`.p5`, and widths `.w10`–`.w100` with 768px / 480px collapse
points.

Every modifier is scoped under `.flex` — `.flex.center`, never a bare
`.center` — so the utilities claim no generic global class names.

### Responsive variants

Every base utility has a `-<bp>` variant at all five breakpoints —
**270 generated rules**. Semantics are Bootstrap's: mobile-first, so a
suffixed class applies **from** that breakpoint **up**.

```html
<div class="w100 w50-sm w33-md w25-lg">…</div>
<div class="flex column row-md between-md gap-2">…</div>
<div class="p1 p3-md p5-lg">…</div>
```

`.flex` itself becomes `.flex-md` (i.e. `display: flex` from md up).
Modifiers keep their scoping: `.flex.center-lg`, never `.center-lg`.

The block is machine-generated from the base rules by
`scratchpad/gen/responsive.js`, between sentinel comments — **edit the base
rules and regenerate, don't hand-edit inside the sentinels.** A test asserts
every base utility has a variant at every breakpoint with identical
declarations, so the two cannot drift.

`utils.css` is mobile-first throughout — every query is `min-width`, and a
test fails if a `max-width` block reappears.

### Buttons

After the generated block, so they get no responsive variants. `.btn` (or
`.button`) is the solid box, on `<button>` or `<a>`; a bare `<button>` stays
unstyled until it carries a style or tone class, so `button.naked` =
`.button.naked` = `.btn.naked`.

| Class | |
|---|---|
| style | `.rounded` `.plain` (fill, no border) `.outline` (border, no fill) `.naked` (no border, no background, no focus outline — text only, every state) `.link` (drawn like `<a>`, no focus outline) |
| tone | `.pr` `.sc` `.da` `.wr` `.ac` — none is neutral |
| size | `.vxs` `.xs` `.sm` `.md` `.lg` `.xlg` — the spacing token drives padding (`size/3` × `size`) and type (`--xs + size/3`); default `.sm`. `.link` keeps its surrounding text size until given one |
| state | `.is-hover` / `.is-focus` force the state, for docs and tests |

```html
<button class="btn outline da">Delete</button>
<button class="naked">Cancel</button>
<a class="btn pr" href="…">Open</a>
```

Each button reads `--btn`, `--btn-bg`, `--btn-subtle`, `--btn-border`,
`--btn-text`, `--btn-focus`, `--btn-size`; a tone class points them at its colour tokens.
Being in `utils`, a page cannot restyle a `.btn` / `.button` — drop the class instead.
Demo: `ge2/component.html#buttons`.

### Layer placement

`utils`, the last layer, so a utility always wins — over `ui`
components and over `page` rules alike. See "Why the layers are split" below
for what that fixed.

### Why the layers are split

Everything used to sit in `base`, so a page rule outranked all of it. An
element carrying both a page class and a framework rule for the same property
silently lost the framework rule — no error, the class just did nothing. It
bit three times:

| Page class | Property | Utility it killed |
|---|---|---|
| `.row` / `.wrap` | `gap`, `flex-*` | `.flex.gap-3`, direction modifiers |
| `.util-chip` / `.util-box` | `padding` | `.p1`–`.p5` |
| `.util-box` | `font-size` | `.fsmall` |

Splitting the layers removes the failure mode by construction. Each boundary
now states an intent, so nothing is accidental: `ui` beating `base` is a
component overriding an element default, `page` beating `ui` is
deliberate customisation, and `utils` beating `page` is a utility doing
its job.

Giving `ui.css` its own layer had a second payoff: it beats `base.css` on
layer order alone, so every selector in it can stay wrapped in `:where()` at
zero specificity. `.icx` previously had to be unwrapped to out-specify
`svg { display: block }`; it no longer does. Keep the file free of bare
class selectors.

One habit still matters: **don't reuse a framework class name in a page
sheet.** That is not customisation, it is a collision — the page silently
restyles `.toast` or `.p3` everywhere, or loses to it and looks broken.
`.row` and `.wrap` became `.controls` and `.page` for this reason. A test
rejects any page class that `ui.css` or `utils.css` already defines, and
another checks every class the page uses actually exists somewhere — reading
the markup **and the page's JS** (`className`, `classList.add`, template
literals), since the icons grid exists only in JS.

### Width behaviour changed on adoption

The ge v1 original carried two desktop-first `max-width` blocks that silently
rewrote the width utilities below 768px and below 480px — `.w25` was not 25%
on a phone, whether you wanted that or not. **Those blocks are removed.**

Widths are now literal at every viewport, and you opt into a change:

```html
<!-- was: .w25 collapsed on its own -->
<div class="w100 w50-sm w25-md">…</div>
```

Markup that relied on the automatic collapse needs the explicit classes
added. Only `ge2/index.html` used them in this project.

### Known rough edges (unchanged from ge v1)

- `.fsmall` sets `font-size: var(--xs)` — 0.5rem / 8px. `--xs` is a *spacing*
  token; the ge v1 convention of reusing spacing for type sizes lands well below
  readable here. `var(--text-sm)` would be the ge equivalent.
- Gap names (`gap-1 2 3 4 6 8`) don't map onto the token names
  (`vxs xs sm md lg xlg`), so you have to remember the translation.

## Breakpoints

The Bootstrap 5 scale, declared in `vars.css`:

| | `--bp-sm` | `--bp-md` | `--bp-lg` | `--bp-xl` | `--bp-xxl` |
|---|---|---|---|---|---|
| | 576px | 768px | 992px | 1200px | 1400px |

`xs` is 0 — the unqualified base, so it needs no query.

**A media query cannot read these.** Queries are evaluated before custom
properties resolve, so `@media (max-width: var(--bp-sm))` never matches. The
literal has to be repeated; the tokens are the written source of truth, and
JS can read them via `getComputedStyle` to build a `matchMedia`.

Write "below" a breakpoint the Bootstrap way, minus `.02px`; "from" one up is
the value exactly:

```css
@media (max-width: 575.98px) { /* below sm */ }
@media (min-width: 768px)    { /* md and up */ }
```

Range syntax (`@media (width < 576px)`) reads better and means the same thing,
but needs Safari 16.4+. ge ships source with no build step, and the rest of
the CSS only needs Safari 16.2 for `color-mix()`, so the `max-width` form
keeps the support floor where it already is. A test enforces this, and
another checks every query value is on the scale.

### What changed on adoption

| File | Was | Now |
|---|---|---|
| `ui.css` (toast) | `max-width: 520px` | below sm |
| `ge-maker.css` | `max-width: 520px` | below sm |
| `utils.css` (tablet) | `max-width: 768px` | removed |
| `utils.css` (mobile) | `max-width: 480px` | removed |

The two `utils.css` blocks were the desktop-first width collapse; they were
first moved onto the scale, then dropped entirely in favour of explicit
`-<bp>` classes. See "Width behaviour changed on adoption" above.

## layout.css

Page-level primitives, imported into `ui` after `ui.css`.

| Class | |
|---|---|
| `.topbar` `.topbar-brand` `.topbar-spacer` | sticky strip; the spacer pushes the rest to the far edge |
| `.hero` `.hero-actions` | banner block, coloured from the `--pr-*` family |
| `.layout` + `.sidemenu` | sticky column beside the content; one column below `md` |
| `.drawer` `.drawer.open` `.drawer-scrim` | slides in from the left, driven by `ui.drawer()` |
| `.dashboard` `.card` `.card-title` `.card-value` `.card-trend.up\|.down` | auto-fitting card grid |

Sizes come from `--sidemenu-width`, `--drawer-width` and `--card-min`.

`.layout`'s content column is `minmax(0, 1fr)`, not `1fr` — without that a
wide child (a long `<pre>`, a table) pushes the grid past its container
instead of scrolling inside it.
