# text-editor — a ge2 plugin

Markdown view/editor. Shows rendered markdown; **Edit** swaps in the source,
**Save** re-renders and writes the file. Pasting or dropping an image,
video or audio file while editing uploads it and inserts a player.

On mount it **reads the saved file back**, so a refresh shows what you saved.
The markdown inside the element in the HTML is only a seed: it is used the
first time, before anything has been written, and ignored afterwards. If the
server cannot be reached the seed is shown rather than a blank editor.

Everything it needs is in this folder. Copy `ge2-plugins/text-editor/` into a
project, add the two imports below, and it works. Delete the folder and
nothing else breaks.

```
ge2-plugins/text-editor/
  readme.md            this file
  config.js            settings
  js/text-editor.js    the component, exports `tex`
  css/text-editor.css  styles — import into layer(plugin)
  php/upload.php       media  -> uploads/<path>/<random>.<ext>
  php/save.php         source -> uploads/<path>/<name>.md
  uploads/             where everything is stored (.htaccess disables exec)
```

## Install

Copy the folder in, then list it in `js/ge2/config.js`:

```js
plugins: {
  'text-editor': {},        // presence loads it; the value is its settings
},
```

and load the enabled plugins from the page's module:

```js
import { loadPlugins } from './ge2/plugins.js';
await loadPlugins();
```

That is the whole install. The loader imports the JS and injects the CSS
into layer `plugin`, which sits between `ui` and `page` — ge2 components
still beat the element defaults, and a page can still restyle the editor.
**Comment the key out and nothing is fetched at all.**

A page that needs mount options can skip the loader and import `tex`
directly instead; otherwise prefer the `tex:save` / `tex:error` events.

The `uploads/` folder must be writable by the web server user, and its
`.htaccess` needs `AllowOverride Options` (or `All`) on the parent
`<Directory>` — without it the exec guard is silently ignored:

```bash
chown -R www-data:www-data ge2-plugins/text-editor/uploads
```

## Markup

```html
<div data-editor
     data-mediapath="note-image"   <!-- -> uploads/note-image/ -->
     data-textpath="notes"         <!-- -> uploads/notes/<id>.md -->
     id="my-note">## hello *world*</div>
```

| Attribute | |
|---|---|
| `data-mediapath` | appended to the configured media base |
| `data-textpath` | appended to the configured text base |
| `data-textname` | filename stem; falls back to the element `id` |

**Paths compose, they do not override.** The config sets a base folder and
the element appends to it:

| config base | `data-*path` | writes to |
|---|---|---|
| `media1` | `demo` | `uploads/media1/demo/` |
| `media1` | — | `uploads/media1/` |
| — | `demo` | `uploads/demo/` |
| — | — | `uploads/` |

A note and its images share a folder, so `uploads/demo/` holds
`demo-note.md` alongside the images pasted into it.

Same for media. Stray slashes are normalised, so `media1/` + `/demo` is
still `media1/demo`.

Subfolders are created on demand. **A name is required to save** — the path
has a default, the name does not. An element with neither an `id` nor a
`data-textname` renders and edits normally but writes nothing, and says so in
the console.

## Settings

Three levels, narrowest first:

| | |
|---|---|
| `data-*` on the element | per element |
| `plugins['text-editor']` in `js/ge2/config.js` | per project |
| `ge2-plugins/text-editor/config.js` | the plugin's defaults |

```js
// js/ge2/config.js — these are BASE folders, appended to
plugins: {
  'text-editor': { textPath: 'media1', mediaPath: 'media1' },
},
```

An empty `{}` enables the plugin with empty bases, so files land in
`uploads/` directly. Removing the key disables the
plugin entirely.

The dependency runs one way: the plugin reads ge2's config, ge2 never reads
the plugin. Remove the plugin and the key is simply ignored.

**The storage root is not settable from JavaScript.** `MEDIA_DIR` and
`TEXT_DIR` live in the PHP, so a browser can only ever choose a subfolder —
move the root by editing those constants, never by trusting the client.

## API

| | |
|---|---|
| `tex.mountAll(sel?, opts?, root?)` | mount every match; returns the handles |
| `tex.mount(el, opts?)` | one element -> `{ source, edit(), save(), cancel() }` |
| `tex.render(md)` | markdown -> sanitised HTML |
| `tex.sourceUrl(path, name)` | where an element's markdown is read/written |
| `tex.upload(file, path?)` | POST one file, resolves to its URL |
| `tex.save(src, {path, name})` | POST the markdown, resolves to its path |
| `tex.use({ marked, purify })` | supply the libs instead of fetching them |
| `tex.joinPath(...parts)` | how base + attribute are combined |
| `tex.config` | the resolved settings |
| `init(settings)` | the hook `js/ge2/plugins.js` calls; mounts everything |

Saving fires a bubbling `tex:save` (`detail.source`, `detail.file`) as well
as calling `onSave(src, el, file)`; a failed upload or save fires
`tex:error`.

Endpoint URLs and stored paths are resolved from `import.meta.url`, not the
page, so a page at any depth works and stored links stay valid when the
content is shown somewhere else.

## Media

| Kind | Accepted | Inserted as |
|---|---|---|
| Image | png, jpeg, gif, webp, avif | `![](url)` |
| Video | mp4, webm, ogv | `<video src controls>` |
| Audio | mp3, ogg, wav | `<audio src controls>` |

Markdown has no audio or video syntax — marked passes the raw HTML through
and the browser plays it. DOMPurify keeps `<audio>`/`<video>` and their
`src`/`controls` while stripping handlers like `onerror`, so the players
work without opening a hole.

SVG is deliberately **not** accepted: it can carry script.

The stored extension always comes from the MIME type the server sniffs, never
from the filename — so `track.mp3` containing PHP is rejected, and a real
MP3 named `.txt` is still stored as `.mp3`.

## Security

marked + DOMPurify load from CDN on first use, so a page with no editor
fetches nothing. **Output is always sanitised** — markdown permits raw HTML,
so rendering untrusted source unsanitised is an XSS hole. `tex.use()` skips
the CDN if you bundle your own copies.

Both endpoints write into the web root, and **neither authenticates**. Read
their headers before exposing them. They whitelist by sniffed MIME type (not
filename), store random names, force the extension, and reject rather than
rewrite a hostile path. `uploads/.htaccess` disables execution — that is
Apache-only; nginx needs an equivalent location block.
