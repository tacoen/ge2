# css/ge2/color.md — how ge2 colours work

Notes for turning into a directive. Sections 1–4 describe the current
`css/ge2/vars.css` as it is. Section 5 is a suggestion. Section 6 is a draft
directive to edit. Section 7 is the roadmap for applying section 5.
**Nothing here has been applied.**

Numbers are resolved sRGB values and WCAG contrast ratios, worked out from the
default seeds. `vars-overrides.css` is empty, so these are what ships.

---

## 1. Vocabulary

Every neutral colour token answers two questions. **What does it paint?** That
is the *role*. **How far is it from the base?** That is the *intensity*.

### Role: what the token paints

| Role | Base token | Paints | Tokens |
|---|---|---|---|
| **fg**: foreground | `--fg` | text, icons (`currentColor`) | `--fg` `--muted` `--subtle` `--inset` |
| **bg**: background / surface | `--bg` | fills of page, panels, controls | `--bg` `--bg-subtle` `--bg-muted` `--bg-inset` `--bg-overlay` |
| **border** | *(none; derived from `--bg`)* | outlines, dividers, rules | `--border-muted` `--border` `--border-hover` |
| **shadow** | `--black` | `box-shadow` only | `--shadow` |

Text tokens have no `fg-` prefix: `--muted` is a *text* colour. Only surfaces
carry `bg-` and only lines carry `border-`. So a bare `--muted` and
`--bg-muted` are two different tokens with two different jobs.

### Intensity: how far from the base

These words should mean the same thing in every role:

| Word | Should mean | Typical use |
|---|---|---|
| *(none)* | the base itself | body text, page background, default outline |
| **subtle** | smallest step away from the base, barely there | hover wash, tertiary text, faint tint |
| **muted** | a clear step away, still quiet | secondary text, panel fill, internal divider |
| **inset** | sunken, the *opposite* direction from a raised surface | input fields, code blocks, wells, tracks |
| **hover** | the strongest step, marking an interactive state | border on hover/focus |
| **overlay** | covers the page | modal / drawer backdrop |

⚠ **Today the code does not follow this table.** In several places the order
flips between light and dark. See §4.

### Functional colours: tone

Five hues, each a small family of its own:

| Tone | Meaning | Seed |
|---|---|---|
| `pr` | primary | `--seed-pr` |
| `sc` | success | `--seed-sc` |
| `da` | danger | `--seed-da` |
| `wr` | warning | `--seed-wr` |
| `ac` | accent / links | `--seed-ac` |

| Suffix | Paints | Role |
|---|---|---|
| `--pr` | text, icon, indicator (the tone itself) | fg |
| `--pr-bg` | stronger tinted fill (button hover) | bg |
| `--pr-subtle` | lighter tinted fill (button rest, active tab/link) | bg |
| `--pr-border` | tinted outline | border |
| `--pr-bg-text` | text placed on `-bg` / `-subtle` (always `--fg`) | fg |

In the tone families, `-subtle` means a weaker fill than `-bg`. That is the
reading §1 intends for every role.

---

## 2. Pipeline

```
seeds (per theme)                 derived (per theme)          consumers
─────────────────                 ───────────────────          ─────────
--bg  --fg  --gray        ──►     --muted/--subtle/--inset ──► base/ui/layout/utils.css
--white --black (fixed)           --bg-* --border-* --shadow   page sheets, plugins
--seed-pr/sc/da/wr/ac     ──►     --pr … --ac  + -bg/-subtle/-border/-bg-text
```

- **Theme switch:** `data-theme="light|dark"` on `<html>`, written by
  `js/ge2/ui.js`. With no attribute you get light, because the light block is
  `:root, [data-theme='light']`.
- **Every derived colour is `color-mix(in srgb, A, B p%)`.** Read it as
  "(100−p)% of A plus p% of B". Most of the confusion in §4 comes from the
  operand order changing between themes, which silently flips the meaning.
- **Overriding:** set seeds in `css/vars-overrides.css` and every derived
  token follows. Overriding a derived token directly also works, but only for
  that token.

### Seeds

| Seed | light | dark |
|---|---|---|
| `--bg` | `#f0f0f0` | `#181118` |
| `--fg` | `#242323` | `#e7eee7` |
| `--gray` | `#716f6f` | `#b0b0b0` |
| `--seed-pr` | `#1989ae` | `#66ccee` |
| `--seed-sc` | `#4da34d` | `#88cc66` |
| `--seed-da` | `#9d4343` | `#cc1111` |
| `--seed-wr` | `#ff9911` | `#ffcc33` |
| `--seed-ac` | `#181886` | `#4ca8e1` |

`--gray` is a seed that exists only to feed the text tints and (in light) the
tone borders. Nothing paints with it directly.

---

## 3. Current formulas, resolved

### fg: text

| Token | light formula | light | vs bg | dark formula | dark | vs bg |
|---|---|---|---|---|---|---|
| `--fg` | seed | `#242323` | 13.75 | seed | `#e7eee7` | 15.71 |
| `--subtle` | `mix(gray, fg 25%)` | `#5e5c5c` | 5.83 | `mix(fg, gray 25%)` | `#d9ded9` | 13.66 |
| `--muted` | `mix(gray, fg 50%)` | `#4a4949` | 7.86 | `mix(fg, gray 50%)` | `#cccfcc` | 11.79 |
| `--inset` | `mix(gray, fg 75%)` | `#373636` | 10.56 | `mix(fg, gray 75%)` | `#bec0be` | 10.09 |

Usage: `--muted` is everywhere (secondary labels, inactive nav, hints, naked
buttons). `--subtle` and `--inset` are used only by the token preview in
`css/ge-maker.css`.

### bg: surfaces

| Token | light formula | light | vs bg | dark formula | dark | vs bg |
|---|---|---|---|---|---|---|
| `--bg` | seed | `#f0f0f0` | — | seed | `#181118` | — |
| `--bg-subtle` | `mix(bg, black 20%)` | `#c0c0c0` | 1.60 | `mix(bg, white 5%)` | `#241d24` | 1.12 |
| `--bg-muted` | `mix(bg, black 15%)` | `#cccccc` | 1.41 | `mix(bg, white 15%)` | `#3b353b` | 1.55 |
| `--bg-inset` | `mix(bg, black 10%)` | `#d8d8d8` | 1.25 | `mix(bg, black 30%)` | `#110c11` | 1.04 |
| `--bg-overlay` | `mix(bg, black 25%)` | `#b4b4b4` | 1.82 | `mix(bg, black 25%)` | `#120d12` | 1.04 |

Usage:
- `--bg-subtle`: hover wash (accordion, sidebar, tabs), active tab, and
  panels (topbar, sidemenu, cards, text-editor).
- `--bg-muted`: only in `ge-maker.css`.
- `--bg-inset`: inputs, scrollbar track, sidemenu hover, button rest fill.
- `--bg-overlay`: the opaque modal/drawer backdrop *and* the neutral button
  hover fill (`--btn-bg`).

### border

| Token | light formula | light | vs bg | dark formula | dark | vs bg |
|---|---|---|---|---|---|---|
| `--border-muted` | `mix(bg, black 40%)` | `#909090` | 2.80 | `mix(bg, white 10%)` | `#2f292f` | 1.30 |
| `--border` | `mix(bg, black 20%)` | `#c0c0c0` | 1.60 | `mix(bg, white 15%)` | `#3b353b` | 1.55 |
| `--border-hover` | `mix(bg, black 30%)` | `#a8a8a8` | 2.09 | `mix(bg, white 20%)` | `#464146` | 1.85 |

Usage: `--border` is the default outline. `--border-muted` is used for inner
dividers (`hr`, modal footer, nested sidebar rule, table rows).
`--border-hover` is used on input hover/focus and the scrollbar thumb hover.

### shadow

| | light | dark |
|---|---|---|
| `--shadow` | `mix(black, transparent 95%)`, i.e. black at 5% | black at 40% |

### Functional

| Token | light | dark |
|---|---|---|
| `--X` | `mix(seed-X, fg 50%)` | `mix(seed-X, fg 30%)` |
| `--X-bg` | `mix(bg, X 40%)` | `mix(bg, X 20%)` |
| `--X-subtle` | `mix(bg, X 30%)` | `mix(bg, X 10%)` |
| `--X-border` | `mix(gray, X 20%)` ← from **gray** | `mix(bg, X 40%)` ← from **bg** |
| `--X-bg-text` | `var(--fg)` | `var(--fg)` |

Resolved (the tone vs bg, then `--fg` on `-bg`):

| Tone | light `--X` | vs bg | light `-bg` | fg on it | dark `--X` | vs bg | dark `-bg` | fg on it |
|---|---|---|---|---|---|---|---|---|
| pr | `#1e5668` | 7.12 | `#9cb2ba` | 7.11 | `#8dd6ec` | 11.46 | `#2f3842` | 10.01 |
| sc | `#386338` | 6.12 | `#a7b8a6` | 7.47 | `#a4d68d` | 11.14 | `#34382f` | 10.09 |
| da | `#603333` | 9.10 | `#b7a4a4` | 6.63 | `#d45351` | 4.56 | `#3e1e23` | 12.56 |
| wr | `#925e1a` | 4.81 | `#cab69a` | 7.95 | `#f8d669` | 13.10 | `#453828` | 9.58 |
| ac | `#1e1e54` | 13.50 | `#9c9cb2` | 5.82 | `#7abde3` | 9.03 | `#2c3341` | 10.70 |

All text pairs pass AA (4.5). Mixing 50% `--fg` into the seed in light
desaturates the tones heavily: `--ac` light is almost navy-black, and `--da`
light reads brown.

---

## 4. What is inconsistent today

Ranked by how much it bites.

1. **`--border` equals `--bg-subtle` in light.** Both are
   `mix(bg, black 20%)` = `#c0c0c0`. Every component painted
   `bg-subtle` + `border` has an invisible outline in light: `.card`,
   `.topbar`, `.sidemenu`, `.text-editor`, and the ge-maker panels. Dark
   happens to escape (`#241d24` vs `#3b353b`).
2. **The text order flips between themes.** The operands swap: light is
   `mix(gray, fg …)`, dark is `mix(fg, gray …)`. So:
   - light: `subtle` (weakest) → `muted` → `inset` (strongest)
   - dark: `inset` (weakest) → `muted` → `subtle` (strongest)

   `--muted` is 50/50, so it survives. `--subtle` and `--inset` mean opposite
   things per theme.
3. **The border order flips.** `--border-muted` is the *strongest* border in
   light (40%) and the *weakest* in dark (10%). An `hr` is a heavy line in
   light and a faint one in dark.
4. **The surface order flips.** In light, `bg-subtle` is the darkest surface
   (20%) and `bg-inset` the closest to bg (10%). In dark, `bg-subtle` is the
   closest (5%), `bg-muted` the most raised, and `bg-inset` is sunken. Light
   has no "sunken" at all: all three go the same direction, darker.
5. **`--bg-overlay` has two jobs.** It is the modal/drawer scrim (fully
   opaque, so the page behind disappears rather than dims). It is also the
   neutral button hover fill. In dark it resolves to `#120d12`, 1.04:1
   against bg, so the neutral button hover and the backdrop are both nearly
   invisible.
6. **Tone borders derive from different bases.** Light uses
   `mix(gray, X 20%)`: 80% gray, barely tinted, a darker outline. Dark uses
   `mix(bg, X 40%)`: a tinted line. They look like two different designs.
7. **Non-text contrast.** WCAG 1.4.11 asks 3:1 for the boundary of a
   control. Input borders (`--border`) are 1.60 light / 1.55 dark, and even
   hover/focus (`--border-hover`) is 2.09 / 1.85. Controls only register
   because of the `--bg-inset` fill.
8. **Docs drift.** ~~The Palette row in `css/ge2/readme.md` omits `--subtle`,
   `--inset` and `--bg-muted`.~~ Fixed in roadmap step 1.

---

## 5. Suggestion

### Principle

**One meaning per word, one formula per token, same in both themes.** Themes
change *seeds*, plus two direction seeds. They do not change formulas.

- `--tint`: the direction a surface *rises*. `--black` in light (panels get a
  touch darker than the page), `--white` in dark.
- `--sink`: the opposite direction, for inset. `--white` in light (inputs
  lighter than the page, the usual convention), `--black` in dark.
- Intensity is always ordered **subtle < muted < (base) < hover**, and
  **inset goes the other way**.
- Borders and text mix toward `--fg`, not `--black`/`--white`. That way they
  always move *away from* the background, whichever theme is on.

### Proposed formulas (written once, not per theme)

```css
/* per theme: seeds + direction */
:root, [data-theme='light'] { /* existing seeds … */ --tint: var(--black); --sink: var(--white); }
[data-theme='dark']         { /* existing seeds … */ --tint: var(--white); --sink: var(--black); }

/* derived: ONE block, no theme selector */
:root, [data-theme] {
  /* fg: text, strongest → weakest */
  --muted:  color-mix(in srgb, var(--fg), var(--gray) 50%);   /* secondary text   */
  --subtle: color-mix(in srgb, var(--fg), var(--gray) 85%);   /* tertiary, hints  */

  /* bg: surfaces */
  --bg-subtle:  color-mix(in srgb, var(--bg), var(--tint) 4%);  /* hover wash, card     */
  --bg-muted:   color-mix(in srgb, var(--bg), var(--tint) 8%);  /* panel, active/select */
  --bg-inset:   color-mix(in srgb, var(--bg), var(--sink) 40%); /* input, code, well    */
  --bg-overlay: color-mix(in srgb, var(--black), transparent 50%); /* scrim only       */

  /* border: weakest → strongest */
  --border-muted: color-mix(in srgb, var(--bg), var(--fg) 12%); /* inner divider      */
  --border:       color-mix(in srgb, var(--bg), var(--fg) 22%); /* component outline  */
  --border-hover: color-mix(in srgb, var(--bg), var(--fg) 50%); /* hover/focus, 3:1   */

  /* tones: same shape for every X, same in both themes */
  --X-subtle: color-mix(in srgb, var(--bg), var(--X) 10%);
  --X-bg:     color-mix(in srgb, var(--bg), var(--X) 20%);
  --X-border: color-mix(in srgb, var(--bg), var(--X) 40%);
  --X-bg-text: var(--fg);
}
```

`--X` itself can keep a per-theme strength (light 50%, dark 30%). The seeds
differ in lightness, so that difference is justified. It is the only formula
that should differ.

### Proposed values, resolved

| Token | light | vs bg | dark | vs bg |
|---|---|---|---|---|
| `--muted` | `#4a4949` | 7.86 | `#cccfcc` | 11.79 |
| `--subtle` | `#656464` | 5.19 | `#b8b9b8` | 9.45 |
| `--bg-subtle` | `#e6e6e6` | 1.09 | `#211b21` | 1.10 |
| `--bg-muted` | `#dddddd` | 1.19 | `#2a242a` | 1.23 |
| `--bg-inset` | `#f6f6f6` | 1.05 *(lighter)* | `#0e0a0e` | 1.06 *(darker)* |
| `--border-muted` | `#d8d7d7` | 1.26 | `#312c31` | 1.35 |
| `--border` | `#c3c3c3` | 1.55 | `#464246` | 1.87 |
| `--border-hover` | `#8a8a8a` | 3.05 | `#808080` | 4.66 |

Checks:
- Order holds in both themes: `subtle < muted` for surfaces, `border-muted <
  border < border-hover` for lines, `fg > muted > subtle` for text.
- `--border` is now always ≥ 1.3:1 against `--bg-muted`, so a bordered panel
  never loses its outline (fixes §4.1, together with the new surfaces).
- `--subtle` text stays ≥ 4.5:1 on bg and ≥ 4.3 on `--bg-muted`, so it is
  usable as hint text. Don't put it on `-bg` tone fills.
- `--border-hover` reaches 3:1, which satisfies 1.4.11 for focused/hovered
  controls. Resting inputs still rely on the `--bg-inset` fill.

### Drop or rename

- **`--inset` (text).** "Inset" is a surface idea. As a text colour it has no
  meaning, and nothing outside the token preview uses it. Drop it, or rename
  it `--fg-strong` if a heading tint is wanted.
- **`--bg-overlay` for buttons.** Point the neutral `--btn-bg` (hover fill) at
  `--bg-muted` instead. `--bg-overlay` then means only "scrim", and can become
  translucent so the page dims instead of vanishing.

### Cost

This needs edits to `css/ge2/vars.css` (and `--btn-bg` in
`css/ge2/utils.css`), so each needs approval under CLAUDE.md. Visible
changes in light: surfaces get lighter, inputs turn near-white, `hr` gets
fainter. Visible change in dark: `--subtle`/`--inset` swap meaning.
`vars-overrides.css` is empty, so no project overrides break.

---

## 6. Directive (draft, edit me)

> **Colour tokens: rules**
>
> 1. Paint text with `--fg` / `--muted` / `--subtle`. Paint surfaces with
>    `--bg` / `--bg-subtle` / `--bg-muted` / `--bg-inset`. Paint lines with
>    `--border-muted` / `--border` / `--border-hover`. Never cross roles (no
>    `--border` as a background, no `--bg-*` as text).
> 2. Intensity words mean the same in every role: **subtle** = smallest step,
>    **muted** = clear step, **inset** = sunken (opposite of raised),
>    **hover** = strongest, interactive only.
> 3. Formulas are written once. A theme changes seeds (`--bg --fg --gray
>    --seed-*`) and direction (`--tint --sink`), never a formula.
> 4. Text and borders mix toward `--fg`. Surfaces mix toward `--tint` /
>    `--sink`. Nothing mixes toward a literal colour.
> 5. Tones use the tone family only: `--X` for text/indicator, `--X-subtle`
>    for rest fill, `--X-bg` for hover fill, `--X-border` for outline,
>    `--X-bg-text` for text on a fill.
> 6. A border on a filled surface must be at least one step stronger than
>    that fill.
> 7. Text ≥ 4.5:1 on the surface it sits on. Interactive boundaries in
>    hover/focus ≥ 3:1.
> 8. Retune colour through seeds in `css/vars-overrides.css`. Override a
>    derived token only as a last resort, and say why.

---

## 7. Roadmap (not applied)

Nine steps, ordered so each is small, can be reviewed on its own, and leaves
the site working. Each step says the files it touches, whether CLAUDE.md
approval is needed (**⚑** = edits `css/ge2/*.css`), what changes on screen,
and how to check it.

Check pages for every step: `ge2/token.html` (the token preview and
playground), `ge2/component.html` (buttons, modal, tabs, accordion, toast),
`ge2/layout.html` (topbar, sidemenu, drawer, cards) and `ge2/index.html`
(text-editor). Look at each in **both themes**.

### Step 0: baseline

- Screenshot the four check pages in light and dark.
- Clear the token playground (`bucketClear`) so no stored overrides hide the
  change. `css/vars-overrides.css` is empty today. Keep it empty until
  step 8.
- Touches: nothing.

### Step 1: fix the readme drift ✅ done 2026-09-28

- `css/ge2/readme.md`: list `--subtle`, `--inset` and `--bg-muted` in the
  Palette row, and link to this file.
- Touches: docs only. No approval. No visual change.

### Step 2: add the direction seeds ⚑ ✅ done 2026-09-28

- `css/ge2/vars.css`: add `--tint` / `--sink` to the two seed blocks (light:
  black / white; dark: white / black).
- Nothing reads them yet, so there is no visual change. Doing this alone keeps
  the later diffs about formulas only.
- Check: in devtools, `getComputedStyle(document.documentElement).getPropertyValue('--tint')`
  should flip with the theme.

### Step 3: borders ⚑ (fixes §4.3, §4.7) ✅ done 2026-09-28

- `css/ge2/vars.css`: replace both border blocks with the single `--fg`-based
  ramp from §5 (12 / 22 / 50%). Written as one `:root, [data-theme]` block
  after the two theme blocks.
- On screen:
  - light `hr`, modal footer and table rules get much fainter (40% → 12%)
  - input hover/focus darkens in both themes
- Check: an input on hover reaches 3:1 (3.05 light / 4.66 dark).
- **Correction: this step alone does not fix §4.1.** Light `--border` moves
  from `#c0c0c0` to `#c3c3c3`, but `--bg-subtle` is still `#c0c0c0` until
  step 5, so the card/topbar/sidemenu outlines stay invisible in light
  (≈1.03:1). They appear once step 5 lightens `--bg-subtle` to `#e6e6e6`.
  The roadmap originally claimed step 3 fixed this on its own; that was wrong.

### Step 4: text ramp ⚑ (fixes §4.2) ✅ done 2026-09-28, `--inset` dropped

Done as one shared block with the borders. `--inset` was also in the preview
sample text in `js/ge-maker/token.js` (the `pv-inset` span), removed with it.


- `css/ge2/vars.css`: one formula order for both themes. `--muted` = fg/gray
  50% (unchanged value), `--subtle` = fg/gray 85%.
- Decide `--inset` (text):
  - **drop:** remove it from `vars.css`, `.pv-inset` in `css/ge-maker.css`,
    the `fg` row in `js/ge-maker/token.js` (`DERIVED`), and the prose in
    `ge2/token.html` line ~57
  - **or rename** to `--fg-strong` in the same four places
- On screen: only the token preview (no ge2 component uses `--subtle` or
  `--inset`). Dark `--subtle` goes from near-`--fg` to near-`--gray`.

### Step 5: surfaces ⚑ (fixes §4.4, completes §4.1) ✅ done 2026-09-28

Done in the shared block. Besides the three remaps below, the demo's bare
`button` / `input[type=submit…]` rule in `css/ge-maker.css` (~line 110) also
moved from `--bg-inset` to `--bg-subtle`, to match `--btn-subtle`.


- `css/ge2/vars.css`: `--bg-subtle` / `--bg-muted` via `--tint` (4 / 8%),
  `--bg-inset` via `--sink` (40%).
- **Remap consumers first.** Some rules use `--bg-inset` for *hover*. Once
  inset means "sunken" (lighter in light), those hovers would go the wrong
  way:

  | File | Rule | Now | Should be |
  |---|---|---|---|
  | `css/ge2/layout.css:74` ⚑ | `.sidemenu a:hover` | `--bg-inset` | `--bg-subtle` |
  | `ge2-plugins/text-editor/css/text-editor.css:34` | `.tex-btn:hover` | `--bg-inset` | `--bg-subtle` |
  | `css/ge2/utils.css:386` ⚑ | `--btn-subtle` (button rest fill) | `--bg-inset` | `--bg-subtle` |

  Keep `--bg-inset` on true wells: inputs (`base.css:93`), scrollbar track,
  the text-editor source pane, code blocks in `ge-maker.css`.
- On screen, in light: panels go from `#c0c0c0` to `#e6e6e6` (much lighter),
  and inputs become near-white `#f6f6f6`. The biggest visual change in the
  roadmap. Compare against the step 0 screenshots.

### Step 6: split overlay ⚑ (fixes §4.5) ✅ done 2026-09-28

Done. `--bg-overlay` now sits in the shared block. The demo's bare-button
hover in `css/ge-maker.css` (~line 131) also moved to `--bg-muted`. `.pv-card`
(the token preview frame) still uses `--bg-overlay`, so it now renders as a
dimmed backdrop — deliberate, it previews the scrim.


- `css/ge2/utils.css:385`: `--btn-bg` (neutral button hover) → `--bg-muted`.
- `css/ge2/vars.css`: `--bg-overlay` → `color-mix(in srgb, var(--black), transparent 50%)`.
- `.drawer-scrim` fades `opacity` 0 → 1 (`layout.css:92`), so it simply
  ends at the translucent colour. Tune the darkness with the `transparent`
  percentage in `--bg-overlay`, not with the opacity.
- On screen: the modal and drawer dim the page instead of hiding it. Neutral
  button hover is visible in dark.

### Step 7: tone variants ⚑ (fixes §4.6) ✅ done 2026-09-28

Done as one shared block after the two `--X` theme blocks.


- `css/ge2/vars.css`: the light `-subtle` / `-bg` / `-border` take the dark
  formulas (bg + X at 10 / 20 / 40%). `--X` keeps its per-theme strength
  (light 50%, dark 30%).
- On screen, in light: tone buttons, toasts, the hero and the active tab get
  much paler (`--pr-bg` `#9cb2ba` → `#c6d1d5`). Borders become tinted
  instead of grey. Text on the fills gets *more* contrast (≈7 → ≈10).
- Taste call: if light looks washed out, raise it to 15 / 30 / 50%, but keep
  one formula.

### Step 8: collapse to one derived block ⚑

- `css/ge2/vars.css`: the theme blocks now hold seeds, `--tint` / `--sink`
  and the `--X` strength only. Everything else moves into one block,
  `:root, [data-theme] { … }`. The `[data-theme]` part makes a nested
  `data-theme` element recompute its own ramp.
- A pure refactor with **zero visual diff**. Verify by comparing the resolved
  values in the token preview before and after.
- Only now resume the playground. Its `THEMED` set in
  `js/ge-maker/token.js` stays the seeds. Add `--tint` / `--sink` only if you
  want them editable.

### Step 9: docs and directive

- `ge2/token.html` (~line 57): rewrite the ramp prose. It currently says
  "read them per theme", and after this there is nothing theme-specific to
  read.
- `js/ge-maker/token.js` `COL_BASE`: the `--white` / `--black` hints
  ("mix target: subtle / borders", "inset / overlay") no longer hold. Both
  are now reached through `--tint` / `--sink`.
- `css/ge2/readme.md`: replace the "Changed while adopting" colour notes with
  a pointer here.
- Finalise §6 and add a line to CLAUDE.md under CSS:
  `Colour → see css/ge2/color.md`.

### Order and dependencies

```
0 ─ 1 ─ 2 ─┬─ 3  borders    (independent, do first)
           ├─ 4  text       (independent)
           ├─ 5  surfaces   (needs 2; remap consumers inside the step)
           ├─ 6  overlay    (after 5, since --btn-bg points at --bg-muted)
           └─ 7  tones      (independent)
                 └─ 8 collapse (after 3–7) ─ 9 docs
```

Approval count under CLAUDE.md: steps 2–8 each touch `css/ge2/*.css`. Steps
5 and 6 touch more than one framework file, so each file needs its own OK.
