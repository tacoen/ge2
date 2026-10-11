# css/ge2/color.md — how ge colours work

How `css/ge2/vars.css` builds its colours today, what each token is for, and
where the system is still rough. Numbers are resolved sRGB values and WCAG
contrast ratios, worked out from the default seeds with an empty
`vars-overrides.css`.

---

## 1. In one paragraph

A theme is three colours — `--bg`, `--fg` and the accent `--ac` — plus five
component seeds. `--ac` is stepped toward `--bg`, toward `--fg` and toward
transparent into a fixed **scale**, and every neutral role in the framework
(surfaces, borders, secondary text, focus, overlay) is a step of that scale.
The five component seeds each get a small **tone** family for buttons,
toasts and alerts. Light and dark differ only in their seeds; every formula
is written once.

---

## 2. Pipeline

```
seeds (per theme)              derived (one formula, both themes)       consumers
─────────────────              ──────────────────────────────────       ─────────
--bg  --fg                ──►  --ac-bg1…5  --ac-fg1…5  --ac-tr1…4  ──►  base/ui/layout/utils.css
--seed-ac  (= --ac)       ──►  surfaces, borders, --muted/--subtle,     page sheets, plugins
                               --focus-color, --bg-overlay
--seed-pr/sc/da/wr/in     ──►  --pr … --in + -subtle/-bg/-border/-bg-text
--tone-fg  --shadow
```

- **Theme switch:** `data-theme="light|dark"` on `<html>`, written by
  `js/ge2/ui.js`. With no attribute you get light: the light block is
  `:root, [data-theme='light']`.
- **Every derived colour is `color-mix(in srgb, A, B p%)`**: (100−p)% of A
  plus p% of B. The derived block sits on `:root, [data-theme]`, so it is
  recomputed on any element that sets a theme.
- **Overriding:** set seeds in `css/vars-overrides.css` (imported right
  after `vars.css`, into `layer(units)`) and everything derived follows. The
  demo's **Theme** page (`ge2/theme.html`) edits them live and downloads that
  file — see §7.

---

## 3. Seeds

| Seed | light | dark | feeds |
|---|---|---|---|
| `--bg` | `#f0f0f0` | `#181118` | page background; the `bg` end of the scale |
| `--fg` | `#242323` | `#e7eee7` | body text; the `fg` end of the scale; tones |
| `--seed-ac` | `#4258ff` | `#6488dd` | `--ac` itself, unmixed |
| `--seed-pr` | `#00d1b2` | `#66ccee` | primary |
| `--seed-wr` | `#ff9911` | `#ffcc33` | warning |
| `--seed-da` | `#ff6685` | `#cc1111` | danger |
| `--seed-sc` | `#4da34d` | `#88cc66` | success |
| `--seed-in` | `#66d1ff` | `#66d1ff` | info / confirm |
| `--tone-fg` | `50%` | `30%` | share of `--fg` mixed into each tone |
| `--shadow` | black at 5% | black at 40% | `box-shadow` only |

`--white` and `--black` sit in the theme-neutral `:root` and are mix
targets only (`--shadow`). `--gray`, `--tint` and `--sink` are still
declared per theme but **nothing derives from them any more** — see §8.

---

## 4. The `--ac` scale

```css
--ac-bgN: color-mix(in srgb, var(--ac), var(--bg) P%);   /* N 1…5, P 15 30 45 60 85 */
--ac-fgN: color-mix(in srgb, var(--ac), var(--fg) P%);   /* same steps */
--ac-trN: color-mix(in srgb, var(--ac), transparent P%); /* N 1…4, P 25 50 75 95 */
```

P is how much of the end goes in, so `bg5` is nearest `--bg` and `fg5`
nearest `--fg` **in either theme**: in light `bg5` is a pale tint, in dark a
dark one, and it means the same thing in both. Each step carries a role
label, shown on the Theme page; the label is what decides which step a token
or a component uses.

| Step | Role label | light | vs `--bg` | dark | vs `--bg` |
|---|---|---|---|---|---|
| `bg5` | muted · subtle | `#d6d9f2` | 1.22 | `#232336` | 1.20 |
| `bg4` | border | `#aab3f6` | 1.75 | `#364167` | 1.86 |
| `bg3` | inset · hover | `#909cf8` | 2.21 | `#425284` | 2.46 |
| `bg2` | active | `#7686fa` | 2.81 | `#4d64a2` | 3.24 |
| `bg1` | focus ring | `#5c6ffd` | 3.59 | `#5976bf` | 4.22 |
| `ac` | solid | `#4258ff` | 4.53 | `#6488dd` | 5.39 |
| `fg1` | solid hover | `#3e50de` | 5.41 | `#7897de` | 6.45 |
| `fg2` | shade | `#3948bd` | 6.49 | `#8ba7e0` | 7.66 |
| `fg3` | text | `#34409c` | 7.79 | `#9fb6e2` | 9.05 |
| `fg4` | strong text | `#30387b` | 9.30 | `#b3c5e3` | 10.62 |
| `fg5` | heading | `#282b44` | 12.12 | `#d3dfe6` | 13.64 |
| `tr1` | — | `--ac` at 75% | | | |
| `tr2` | selection | `--ac` at 50% | | | |
| `tr3` | focus outline | `--ac` at 25% | | | |
| `tr4` | overlay | `--ac` at 5% | | | |

---

## 5. Neutral roles, mapped onto the scale

Every neutral token is an alias of a step, chosen by the step's label:

| Token | = | Label | Paints |
|---|---|---|---|
| `--bg-subtle` | `--ac-bg5` | muted · subtle | hover wash, cards |
| `--bg-muted` | `--ac-bg5` | muted · subtle | panels, active / selected |
| `--bg-inset` | `--ac-bg3` | inset · hover | wells |
| `--bg-overlay` | `--ac-tr4` | overlay | modal / drawer scrim |
| `--border-muted` | `--ac-bg5` | muted | inner dividers (`hr`, table rows, modal footer) |
| `--border` | `--ac-bg4` | border | default outline |
| `--border-hover` | `--ac-bg3` | hover | input hover / focus |
| `--muted` | `--ac-fg3` | text | secondary text, inactive nav, hints |
| `--subtle` | `--ac-fg2` | shade | tertiary text |
| `--focus-color` | `--ac-bg1` | focus ring | `:focus-visible` outline |

Where the framework paints them:

- **Links and submit** — `<a>` and `[type=submit]` (`base.css`) and the
  neutral `.btn.link` (`utils.css`) take `--pr`, not the accent. Links: text in `--pr`, hover in `--fg` underlined in
  `--pr`.
- **`base.css`** — inputs / textarea / select, `pre` and inline `code` on
  `bg5`; scrollbar track `bg5`, thumb `bg3`, thumb hover `bg2`; outlines on
  `--border*`; focus on `--focus-color`.
- **`ui.css`** — hover on accordion header, sidebar toggle and link, tab on
  `bg3`; active tab `bg2`; modal overlay `tr4`; text on `--muted`.
- **`layout.css`** — topbar, sidemenu, card on `bg5`; sidemenu hover `bg3`;
  drawer scrim `tr4`.
- **`utils.css`** — neutral button rest `bg5`, hover `bg3`; `.ac` button rest
  `bg5`, hover `bg3`, border `bg4`, text `fg4`.

`base`, `ui`, `layout` and `utils` reference the steps directly
(`var(--ac-bg3)`), not the `--bg-*` aliases, so overriding `--bg-inset`
changes nothing in the framework itself; override the seed instead.

---

## 6. Component tones

`--pr`, `--sc`, `--da`, `--wr` and `--in` keep their own family:

| Token | Formula | Paints |
|---|---|---|
| `--X` | `mix(seed-X, fg tone-fg)` | text, icon, indicator |
| `--X-subtle` | `mix(bg, X 10%)` | fill at rest |
| `--X-bg` | `mix(bg, X 20%)` | fill on hover |
| `--X-border` | `mix(bg, X 40%)` | outline |
| `--X-bg-text` | `var(--fg)` | text on either fill |

| Tone | light `--X` | vs bg | `--fg` on `-bg` | dark `--X` | vs bg | `--fg` on `-bg` |
|---|---|---|---|---|---|---|
| pr | `#127a6a` | 4.58 | 10.57 | `#8dd6ec` | 11.46 | 10.01 |
| sc | `#386338` | 6.12 | 10.31 | `#a4d68d` | 11.14 | 10.09 |
| da | `#924454` | 5.79 | 10.30 | `#d45351` | 4.56 | 12.56 |
| wr | `#925e1a` | 4.81 | 10.59 | `#f8d669` | 13.10 | 9.58 |
| in | `#457a91` | 4.14 | 10.84 | `#8ddaf8` | 11.90 | 9.90 |

`--ac` is the exception: it is its seed unmixed, and has the scale instead
of `-subtle` / `-bg` / `-border` / `-bg-text`.

---

## 7. Editing a theme

`ge2/theme.html` is the editor. Main holds `--ac` (as `--seed-ac`), `--bg`
and `--fg`; Swatch the five component seeds. Every field takes any CSS
colour. An edit is set inline on `<html>`, so the whole page follows it, and
`js/ge-maker/overrides.js` keeps it **per theme** in `localStorage` and puts
it back on every demo page; switching theme swaps the other theme's set in.
Derived shows the scale with its labels next to a dashboard, a webpage and a
docs article painted from it. **theme · buckets** saves named snapshots of
both themes and downloads `css/vars-overrides.css`: a `:root` block for
theme-neutral tokens, one `[data-theme]` block per theme.

---

## 8. Known rough edges

1. **One colour, three jobs.** `--bg-subtle`, `--bg-muted` and
   `--border-muted` are all `bg5`, so a muted divider on a muted panel is
   invisible, and subtle and muted surfaces no longer differ.
2. **Hover equals inset.** `bg3` is both the hover fill and `--bg-inset` /
   `--border-hover`, so a hovered well does not change.
3. **Non-text contrast.** WCAG 1.4.11 asks 3:1 for a control's boundary.
   `--border` (`bg4`) is 1.75 / 1.86 and `--border-hover` (`bg3`) 2.21 /
   2.46 against `--bg`. Inputs register through their `bg5` fill.
4. **Text on light steps.** `--fg` on `bg1` is 3.83 (light) / 3.72 (dark),
   below 4.5 for body text. Text on solid `--ac` reads best as `bg5`
   (3.71 light, 4.48 dark) — fine for a button label, not for paragraphs.
5. **Secondary text is accent-coloured.** `--muted` (`fg3`) and `--subtle`
   (`fg2`) carry the accent hue. Links are `--pr`, so they still stand out
   from it as long as `--seed-pr` and `--seed-ac` differ in hue.
6. **The overlay barely dims.** `tr4` is `--ac` at 5%; the page behind a
   modal or drawer looks almost unchanged.
7. **Dead seeds.** `--gray`, `--tint` and `--sink` feed nothing in ge.
   Downstream apps may still read them, so they stay until removed on
   purpose.
8. **Two systems for tones.** `--ac` has a scale, the other five have the
   older four-token family.

---

## 9. History

- **Until 2026-09:** neutrals mixed `--bg` toward `--black` / `--white` and
  text toward `--gray`, with operand orders that flipped between themes
  (`--subtle` and `--inset` meant opposite things in light and dark).
- **2026-09-28:** a roadmap fixed the ordering — direction seeds `--tint` /
  `--sink`, ordered text, border and surface ramps, a scrim-only overlay,
  one tone formula for both themes.
- **2026-10:** `--ac` became its own seed with the `bg` / `fg` / `tr` scale,
  and every neutral role moved onto it by label (§5). The old analysis and
  roadmap are in git history, up to and including commit `fba3b2c`.
