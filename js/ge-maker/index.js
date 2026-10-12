// js/ge-maker/index.js — the demo home page: the landing grid and the
// markdown references rendered into it.
import { ui } from '../ge2/ui.js';
import { loadMenu } from './menu.js';

const DOCS = [
  ['ge-maker.md', 'gmref'],
  ['function.md', 'fnref'],
  ['../css/ge2/readme.md', 'cssref'],
  ['../js/ge2/readme.md', 'jsref'],
];
const PLUGIN = '../../ge2-plugins/text-editor/js/text-editor.js';

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);

const slug = (s) => s.toLowerCase().trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-');

async function renderWithPlugin(src) {
  try {
    const { tex } = await import(PLUGIN);
    return await tex.render(src);
  } catch (e) {
    console.warn('[ge-maker] text-editor unavailable, showing raw markdown', e);
    return null;
  }
}

async function mountDoc(file, hostId) {
  const host = ui.el(`#${hostId}`);
  if (!host) return;

  let src;
  try {
    const res = await fetch(file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status}`);
    src = await res.text();
  } catch (e) {
    console.error(`[ge-maker] could not load ${file}`, e);
    host.innerHTML = `<p class="out">${esc(file)} could not be loaded</p>`;
    return;
  }

  const html = await renderWithPlugin(src);
  if (html === null) {
    host.innerHTML = `<pre class="doc-raw">${esc(src)}</pre>`;
    return;
  }
  host.innerHTML = html;

  // Relative links in the markdown point next to the .md, not next to this
  // page — css/ge2/readme.md's `color.md` would otherwise land in ge2/.
  const base = new URL(file, document.baseURI);
  ui.els('a[href]', host).forEach((a) => {
    const href = a.getAttribute('href');
    if (/^([a-z][\w+.-]*:|#|\/)/i.test(href)) return;
    a.href = new URL(href, base).href;
  });

  // Prefix the slug with the host: two documents on one page would otherwise
  // both claim ids like #tests, and the first would win every anchor.
  ui.els('h2, h3', host).forEach((h) => {
    if (!h.id) h.id = `${hostId}-${slug(h.textContent)}`;
  });
}

// The cards are the same list as the sidebar, so they come from the same
// file — a group added to menu.json shows up here without touching the HTML.
async function buildLanding(host = ui.el('.landing')) {
  if (!host) return;

  const menu = await loadMenu();
  if (!menu) {
    host.innerHTML = '<p class="out">menu.json could not be loaded</p>';
    return;
  }

  host.innerHTML = menu.groups
    // Home is the page the grid is on, a group with no items has no summary
    // line to show, and a page outside ge2/ (the quick start) is not a demo.
    .filter((g) => g.page !== 'index.html' && g.items?.length
      && !g.page.startsWith('../'))
    .map((g) => `<a class="landing-card p3" href="${esc(g.page)}">`
      + `<strong>${esc(g.label)}</strong>`
      + `<span class="out">${g.items.map((i) => esc(i.label)).join(', ')}</span>`
      + '</a>')
    .join('');
}

await buildLanding();

for (const [file, hostId] of DOCS) await mountDoc(file, hostId);

// Jump to the anchor the URL asked for: it did not exist at load time.
const target = decodeURIComponent(window.location.hash.slice(1));
if (target) document.getElementById(target)?.scrollIntoView();
