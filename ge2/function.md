# ge — function syntax

Quick reference for everything exported from `js/ge2/`. One line per call,
the markup a component expects, and the gotcha where there is one.
Deeper notes live in `js/ge2/readme.md`; icons in `js/ge2/icons.md`.

Five modules:

| Module | Export | Job |
|---|---|---|
| `ui.js` | `ui`, `GeUI` | DOM helpers + components |
| `icons.js` | `icx` | inline SVG icons |
| `store.js` | `store` | localStorage that cannot throw |
| `config.js` | `config` | per-project settings |
| `plugins.js` | `loadPlugins` | loads `ge2-plugins/*` |

Every module also has a default export, so `import ui from './ge2/ui.js'`
works too.

---

## Bootstrap

```js
import { ui }  from './js/ge2/ui.js';
import { icx } from './js/ge2/icons.js';

icx.observe();     // hydrate [data-icon], now and later
ui.tabs();         // no-ops when the page has no such markup
ui.accordion();
```

Importing `ui.js` applies the theme immediately, before first paint, so the
page never flashes the wrong palette. **Nothing else auto-runs** — every
component is wired by the page that wants it.

This is the root `script.js`, and a new app gets it with the other starter
files — `boiler.html` (the empty page that links `style.css` and
`script.js`), `boiler-config.js`, `boiler-vars-overrides.css` and
`favicon.ico`. The [quick start](../index.html#start) has the copy commands.

---

## ui.js — DOM helpers

Thin wrappers, all null-safe: passing `null` does nothing instead of throwing.

| Call | Returns |
|---|---|
| `ui.el(sel, root = document)` | first match, or `null` |
| `ui.els(sel, root = document)` | a real **array**, not a NodeList |
| `ui.show(el)` · `ui.hide(el)` · `ui.toggle(el)` | — (via `style.display`) |
| `ui.addClass(el, cls)` · `ui.removeClass` · `ui.toggleClass` | — |
| `ui.on(el, ev, fn, opt)` · `ui.off(el, ev, fn, opt)` | — |

`els()` returning an array is the point — `.map()`/`.filter()` work directly.

## ui.js — feedback

```js
ui.toast(msg, type = 'info', duration = 3000)   // -> the toast element
ui.error(msg, err = null)                       // console.error + a 5s error toast
```

`type` is any of `info` · `success` · `error` · `warning` — it becomes the
class `toast-<type>`. The `.toast-container` is created on first use with
`role="status"`, so a screen reader announces it.

## ui.js — copy

```js
ui.copy(btn, target, { success = 'Copied!', duration = 1500 })
```

Binds a click on `btn` that copies `target`'s text, swaps the button label
for `success`, and restores it after `duration`. Uses `execCommand`, not the
async clipboard API, **so it also works on plain `http://` origins** — the
clipboard API is https-only.

## ui.js — keyboard

```js
const off = ui.onKey('Ctrl+K', (e) => …, { target = document, preventDefault = true });
off();   // unbind
```

Combos are written the way you'd say them: `'Ctrl+K'`, `'Escape'`,
`'Shift+Space'`, `'Meta+/'`. Modifiers must match **exactly** — `'Ctrl+K'`
does not fire for Ctrl+Shift+K. Aliases: `esc` `del` `ins` `space` `up`
`down` `left` `right`.

## ui.js — theme

```js
ui.setTheme('light' | 'dark')   // applies + remembers; other values ignored
ui.getTheme()                   // -> 'light' | 'dark' | null
ui.toggleTheme()                // -> the new theme
ui.initTheme()                  // runs on import; rarely called by hand
```

Sets `data-theme` on `<html>`. Precedence: a remembered choice wins, else
`config.theme`, and `'auto'` defers to `prefers-color-scheme`. Storage goes
through `store`, so a private window still themes the page — it just won't
remember the choice next visit.

## ui.js — forms

```js
ui.prepareForm(form)              // ids + labels only
ui.handleForm(form, async (data, form) => { … })
```

`handleForm` takes over submit: it validates, builds `data` from `FormData`
as a plain object, awaits your callback, and on a truthy `result.ok` (or
`true`) toasts *Success!* and resets the form. Return anything else and the
form is left alone — useful when you want to keep what the user typed.

`prepareForm` gives the form a name and every field a unique `id`, then
points the matching `<label for>` at it. Call it again after injecting
fields. It reads **attributes**, never `form.name` / `form.id`: a control
called `name` shadows the property, and the element leaks into the id as
`[object HTMLInputElement]`.

## ui.js — components

Each takes a selector, defaulting to its own class, and initialises every
match. All are safe to call on a page that has none.

### `ui.tabs(selector = '.tabmenu')`

```html
<ul class="tabmenu" data-scope="panels">
  <li data-tab="one" class="active">One</li>
  <li data-tab="two">Two</li>
</ul>
<div id="panels">
  <section class="tab active" id="one">…</section>
  <section class="tab" id="two">…</section>
</div>
```

`data-scope` names the container holding the panels; `data-tab` is a panel's
id. Adds `role="tablist"`/`"tab"`, `aria-selected`, and arrow-key,
Home/End navigation.

### `ui.accordion(selector = '.accordion')`

```html
<div class="accordion" data-single>
  <div class="accordion-item">
    <div class="accordion-header">Title</div>
    <div class="accordion-content">…</div>
  </div>
</div>
```

`data-single` closes the others when one opens. Clicks are delegated, so
items added later work without re-initialising.

### `ui.dropdown(selector = '.dropdown')`

```html
<div class="dropdown">
  <button class="dropdown-toggle">Actions</button>
  <ul class="dropdown-menu"><li><button>Rename</button></li></ul>
</div>
```

Outside click and Escape close it; so does choosing an item — the click
still reaches your handler.

### `ui.contextmenu(selector = '.contextmenu')`

```html
<div data-contextmenu="fileMenu">right-click me</div>
<ul class="contextmenu" id="fileMenu"><li><button>Open</button></li></ul>
```

The menu needs an `id`; `data-contextmenu` on any element points at it.
Opens at the pointer, clamped so it never hangs off the viewport.

### `ui.drawer(selector = '.drawer')`

```html
<button data-drawer="nav">open</button>
<div class="drawer-scrim" data-drawer-for="nav"></div>
<aside class="drawer" id="nav">…</aside>
```

Any `[data-drawer="<id>"]` toggles it; the scrim and Escape close it.
Deliberately *not* `modal()`: a drawer is navigation furniture, so it does
not trap Tab or move the element in the DOM.

### `ui.sidebar(target = '.sidebar', { collapseOn = 575.98 })`

```html
<nav class="sidebar">
  <button class="sidebar-toggle" type="button">…</button>
  <ul class="sidebar-nav">
    <li><a href="#tokens">Token</a></li>
    <li><a href="#components">Component</a>
      <ul><li><a href="#toast">Toast</a></li></ul></li>
  </ul>
</nav>
```

Collapses the rail, folds any `<li>` that holds a nested `<ul>`, and marks
the link whose section is on screen (`IntersectionObserver`). Below
`collapseOn` px it starts collapsed and closes after a tap.

`target` accepts **an element as well as a selector** — a nav you just built
in JS is already to hand, and passing it where a string was expected would
stringify into an invalid selector.

### `ui.modal(action, modalId)`

```js
ui.modal('open', 'confirm');      // 'open' | 'close' | 'destroy'
```

Moves the modal into a shared `.overlay`, sets `role="dialog"`, traps Tab,
and restores focus to whatever was focused before on close. A click on the
backdrop closes it. `ui.trapFocus(modal)` / `ui.releaseFocus()` are exposed
for hand-rolled dialogs — `trapFocus` releases any existing trap first, so
traps never stack.

---

## icons.js

```js
icx.svg('search', { size: 20, strokeWidth: 1.5, class: 'muted' })  // -> markup
icx.hydrate(root = document)      // fill [data-icon] once
icx.observe(root = document.body) // hydrate + watch for new ones -> MutationObserver
icx.has('search')                 // -> boolean
icx.names                         // -> string[]
```

In markup, the usual way:

```html
<span data-icon="search" data-icon-size="20" data-icon-stroke="1.5"></span>
```

Size and stroke come from the `--icon-*` tokens; per-call options are
emitted as inline custom properties, so they override the token without
escaping CSS's reach. A bare number means pixels — `rem`, `%` and `calc()`
pass through untouched. An unknown name warns and renders nothing rather
than breaking the page.

---

## store.js

```js
store.get(key, fallback = null)      // -> string | fallback
store.set(key, value)                // -> true when it stuck
store.getJSON(key, fallback = null)  // parsed; corrupt JSON -> fallback
store.setJSON(key, value)            // -> true when it stuck
store.remove(key)                    // -> boolean
store.available                      // -> boolean (probes)
```

**The only place in ge that touches `localStorage`.** Raw access throws in
a private window, with site data blocked, and in some sandboxed frames — and
it takes the caller's whole `try` block with it. Here every failure degrades
to the fallback, and writes report success as a boolean you may ignore.

---

## config.js

The one file in `js/ge2/` meant to be edited per project.

```js
export const config = {
  theme: 'auto',              // 'auto' | 'light' | 'dark' — a stored choice wins
  themeStorageKey: 'theme',   // change when ge projects share an origin
  plugins: {
    'text-editor': { textPath: '', mediaPath: '' },
  },
};
```

`localStorage` is per-origin, not per-directory, so two ge projects on one
host share a theme unless they use different keys.

A new app does not copy ge's own `config.js`, which enables `text-editor`
for the demo — it copies `boiler-config.js` over it: the same file with an
empty plugin list. The sync never overwrites `config.js`, so the app's edits
stick. Keep the two in step when a setting is added here.

---

## plugins.js

```js
import { loadPlugins } from './js/ge2/plugins.js';
await loadPlugins();                   // -> { 'text-editor': Module, … }
await loadPlugins(['text-editor']);    // override the list (mostly for tests)
```

One key per plugin under `config.plugins`, named after its folder in
`ge2-plugins/`. **Presence is what enables it** — comment a key out and
nothing is fetched. For each, the loader imports
`ge2-plugins/<name>/js/<name>.js`, injects `css/<name>.css` into layer
`plugin`, and calls the module's `init(settings)` with that key's value.

The JS is imported before the CSS goes in, so a missing plugin leaves no
`<style>` pointing at a 404. A plugin that throws is logged and skipped —
one broken plugin never takes the page down.

Core knows nothing about any particular plugin: it reads the list, resolves
paths from its own location, and calls the agreed hook.
