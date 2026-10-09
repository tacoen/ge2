// ge2-plugins/text-editor/js/text-editor.js — markdown view/edit, as `tex`.
//
//   <div data-editor>## hello</div>
//   import { tex } from '../ge2-plugins/text-editor/js/text-editor.js';
//   tex.mountAll();
//
// Self-contained: settings in ../config.js, styles in ../css/, endpoints in
// ../php/, storage in ../uploads/. Drop the ge2-plugins/text-editor folder
// into a project and it works; delete it and nothing else breaks. ge2 core
// has no knowledge of it.
//
// The element shows rendered markdown. "Edit" swaps in a textarea holding
// the raw source; "Save" re-renders and hands the source to onSave. Pasting
// or dropping an image, video or audio file in edit mode uploads it and
// inserts a link.
//
//   <div data-editor data-mediapath="demo" data-textpath="demo"
//        id="my-note">## hello</div>
//
// Paths compose: the config base, then the element's attribute appended to
// it. Both optional — with neither, files land in the uploads root.
//
// On mount the saved file is read back if it exists; the markup's own text
// is only the seed for the first save.
//
// marked + DOMPurify load from CDN on first use (URLs in config.js), so
// nothing is fetched on pages that never open an editor. Rendered HTML is
// always sanitised — markdown allows raw HTML, so unsanitised output is an
// XSS hole whenever the source is not fully trusted.

import { config } from '../config.js';

export { config };

let libs = null;

/**
 * Supply marked + DOMPurify yourself instead of fetching them from a CDN —
 * for a project that bundles its own copies, or an offline/test run.
 * @param {{marked: object, purify: object}} provided
 */
function use(provided) {
  const marked = provided.marked ?? provided.default;
  const purify = provided.purify ?? provided.DOMPurify;
  if (!marked?.parse || !purify?.sanitize) {
    throw new Error('[tex] use() needs { marked, purify }');
  }
  marked.setOptions?.({ gfm: true, breaks: false });
  libs = { marked, purify };
  return libs;
}

async function load() {
  if (libs) return libs;
  const [md, dp] = await Promise.all([
    import(/* @vite-ignore */ config.markdownUrl),
    import(/* @vite-ignore */ config.sanitizerUrl),
  ]);
  const marked = md.marked ?? md.default;
  const purify = dp.default ?? dp;
  marked.setOptions({ gfm: true, breaks: false });
  libs = { marked, purify };
  return libs;
}

/** Markdown -> sanitised HTML. */
async function render(src) {
  const { marked, purify } = await load();
  return purify.sanitize(marked.parse(String(src ?? '')));
}

// ── uploads ───────────────────────────────────────────
const IMAGE = /^image\/(png|jpeg|gif|webp|avif)$/;
const VIDEO = /^video\/(mp4|webm|ogg)$/;
const AUDIO = /^audio\/(mpeg|ogg|wav|x-wav|wave|vnd\.wave)$/;

/** POST one file to config.uploadUrl; resolves to its URL. */
async function upload(file, path = config.mediaPath) {
  if (!IMAGE.test(file.type) && !VIDEO.test(file.type) && !AUDIO.test(file.type)) {
    throw new Error(`unsupported type: ${file.type || 'unknown'}`);
  }
  const body = new FormData();
  body.append('file', file);
  body.append('path', path);

  const res = await fetch(config.uploadUrl, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.stored) throw new Error(data.error || `upload failed (${res.status})`);

  // The server reports a path inside uploads/. Resolve it against this
  // module, not the page: the markdown can be shown by pages at different
  // depths, so a page-relative URL would break as soon as it moved.
  return new URL(`../uploads/${data.stored}`, import.meta.url).pathname;
}

/** Where this element's markdown lives, or null if it has no name. */
function sourceUrl(path, name) {
  if (!name) return null;
  return new URL(`../uploads/${joinPath(path, `${name}.md`)}`, import.meta.url).pathname;
}

/**
 * Read back what was saved. A 404 is the normal first-run case, not an
 * error — it means nothing has been written yet and the markup's own text
 * is the seed. no-store so a refresh never shows a cached copy.
 */
async function fetchSource(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return await res.text();
  } catch (e) {
    console.warn('[tex] could not read stored source', e);
  }
  return null;
}

/** PUT the markdown to config.saveUrl; resolves to the stored path. */
async function save(source, { path, name }) {
  const res = await fetch(config.saveUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, name, source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.stored) throw new Error(data.error || `save failed (${res.status})`);
  return new URL(`../uploads/${data.stored}`, import.meta.url).pathname;
}

/** Join path segments, dropping empties and stray slashes. */
function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

const snippet = (url, type) =>
  VIDEO.test(type) ? `<video src="${url}" controls></video>`
    : AUDIO.test(type) ? `<audio src="${url}" controls></audio>`
      : `![](${url})`;

function insert(textarea, text) {
  const { selectionStart: a, selectionEnd: b, value } = textarea;
  textarea.value = value.slice(0, a) + text + value.slice(b);
  textarea.selectionStart = textarea.selectionEnd = a + text.length;
  textarea.focus();
}

// ── component ─────────────────────────────────────────
/**
 * Turn one element into a markdown view/editor.
 * @param {Element} el         holds the markdown source as text on first mount
 * @param {{onSave?: (src: string, el: Element) => any, path?: string}} [opts]
 */
function mount(el, opts = {}) {
  if (!el || el.dataset.texDone) return null;
  el.dataset.texDone = '1';

  // Config sets the base folder, the element appends to it — they compose
  // rather than override. config 'media1' + data-mediapath 'demo' ->
  // 'media1/demo'; either alone is used on its own; neither means the
  // uploads root itself.
  const mediaPath = joinPath(opts.mediaPath ?? config.mediaPath, el.dataset.mediapath);
  const textPath = joinPath(opts.textPath ?? config.textPath, el.dataset.textpath);
  const textName = el.dataset.textname || el.id || null;
  const { onSave } = opts;
  const path = mediaPath;
  let source = (el.textContent || '').trim();
  let editing = false;

  el.classList.add('tex');
  const bar = document.createElement('div');
  bar.className = 'tex-bar';
  const view = document.createElement('div');
  view.className = 'tex-view';
  const area = document.createElement('textarea');
  area.className = 'tex-input';
  area.hidden = true;
  area.setAttribute('aria-label', 'Markdown source');

  const btn = (label, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tex-btn ${cls}`;
    b.textContent = label;
    bar.appendChild(b);
    return b;
  };
  const editBtn = btn('Edit', 'tex-edit');
  const saveBtn = btn('Save', 'tex-save');
  const cancelBtn = btn('Cancel', 'tex-cancel');

  el.textContent = '';
  el.append(bar, view, area);

  async function paint() {
    view.innerHTML = await render(source);
  }

  function setEditing(on) {
    editing = on;
    el.classList.toggle('editing', on);
    view.hidden = on;
    area.hidden = !on;
    editBtn.hidden = on;
    saveBtn.hidden = !on;
    cancelBtn.hidden = !on;
    if (on) { area.value = source; area.focus(); }
  }

  editBtn.addEventListener('click', () => setEditing(true));
  cancelBtn.addEventListener('click', () => setEditing(false));

  saveBtn.addEventListener('click', async () => {
    source = area.value;
    await paint();
    setEditing(false);

    // The folder always resolves — to the uploads root if nothing is set.
    // The name does not: without one there is nothing to call the file.
    let file = null;
    if (!textName) {
      console.warn('[tex] nothing saved: set data-textname or an id');
    } else {
      try {
        file = await save(source, { path: textPath, name: textName });
      } catch (e) {
        console.error('[tex] save failed', e);
        el.dispatchEvent(new CustomEvent('tex:error', { detail: { error: e }, bubbles: true }));
      }
    }

    el.dispatchEvent(new CustomEvent('tex:save', { detail: { source, file }, bubbles: true }));
    try { await onSave?.(source, el, file); } catch (e) { console.error('[tex] onSave failed', e); }
  });

  // paste / drop -> upload -> insert at the cursor
  async function take(files) {
    for (const file of files) {
      el.classList.add('uploading');
      try {
        insert(area, snippet(await upload(file, path), file.type));
      } catch (e) {
        console.error('[tex] upload failed', e);
        el.dispatchEvent(new CustomEvent('tex:error', { detail: { error: e }, bubbles: true }));
      } finally {
        el.classList.remove('uploading');
      }
    }
  }

  area.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (!files.length) return;
    e.preventDefault();
    take(files);
  });

  area.addEventListener('dragover', (e) => e.preventDefault());
  area.addEventListener('drop', (e) => {
    const files = [...(e.dataTransfer?.files ?? [])];
    if (!files.length) return;
    e.preventDefault();
    take(files);
  });

  setEditing(false);

  // Load what was saved, falling back to the inline text on first run, then
  // render. Without this a refresh would show the markup's seed content
  // again and silently discard everything that had been saved.
  (async () => {
    const url = sourceUrl(textPath, textName);
    if (url) {
      const saved = await fetchSource(url);
      if (saved !== null) source = saved;
    }
    await paint();
  })();

  return {
    get source() { return source; },
    set source(v) { source = String(v); paint(); },
    edit: () => setEditing(true),
    save: () => saveBtn.click(),
    cancel: () => setEditing(false),
  };
}

/** Mount every [data-editor] under `root`. */
function mountAll(selector = '[data-editor]', opts = {}, root = document) {
  return [...root.querySelectorAll(selector)].map((el) => mount(el, opts)).filter(Boolean);
}

/** Hook called by js/ge2/plugins.js. Pages wanting options can skip the
 *  loader and call tex.mountAll() themselves. */
export function init() {
  mountAll();
}

export const tex = { render, mount, mountAll, upload, save, use, joinPath, sourceUrl, init, config };
export default tex;
