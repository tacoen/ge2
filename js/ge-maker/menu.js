// js/ge-maker/menu.js — builds the shared sidebar from ge2/menu.json.
//
// One menu, seven pages. A group whose page is the current one links to plain
// #anchors so ui.sidebar()'s scrollspy can track them; every other group
// links across to its page. Keeping the structure in JSON means adding a
// section is a data edit, not seven HTML edits.

import { ui } from '../ge2/ui.js';

// window.location, not the bare global: the latter is not guaranteed to
// exist in every host that runs this module.
const here = () => window.location.pathname.split('/').pop() || 'index.html';

// The file is fetched once per page and handed to whoever asks: the sidebar
// needs it, and so does the landing grid on index.html.
let pending = null;

export function loadMenu(src = 'menu.json') {
  pending ??= fetch(src, { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    })
    .catch((e) => {
      console.error('[ge-maker] could not load the menu', e);
      return null;
    });
  return pending;
}

export async function buildMenu(nav = ui.el('.sidebar'), src = 'menu.json') {
  if (!nav) return null;

  const menu = await loadMenu(src);
  if (!menu) {
    nav.innerHTML = '<p class="out">menu.json could not be loaded</p>';
    return null;
  }

  const page = here();
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);

  const groups = menu.groups.map((g) => {
    const mine = g.page === page;
    const here = mine ? ' aria-current="page"' : '';

    // An entry with no items is a plain link — Home, for instance. It gets no
    // nested <ul>, so ui.sidebar() does not treat it as a foldable group.
    if (!g.items?.length) {
      return `<li class="sidebar-link${mine ? ' current' : ''}">`
        + `<a href="${esc(g.page)}"${here}>${esc(g.label)}</a></li>`;
    }

    const items = g.items.map((i) => {
      // An item with an href links straight to a file (the quick start's
      // starter files) instead of an anchor on the group's page.
      const href = i.href ?? (mine ? `#${i.anchor}` : `${g.page}#${i.anchor}`);
      return `<li><a href="${esc(href)}">${esc(i.label)}</a></li>`;
    }).join('');
    return `<li${mine ? ' class="open current"' : ''}>`
      + `<a href="${esc(mine ? `#${g.id}` : g.page)}"${here}>${esc(g.label)}</a>`
      + `<ul>${items}</ul></li>`;
  }).join('');

  nav.innerHTML =
    '<div class="sidebar-bar">'
    + '<button class="sidebar-toggle" type="button" aria-label="Toggle menu">menu</button>'
    + '<button class="sidebar-theme" type="button" aria-label="Toggle theme" title="Toggle theme"></button>'
    + '</div>'
    + `<ul class="sidebar-nav">${groups}</ul>`;

  // A page that keeps per-theme state (token.js) cancels the event and does
  // the switch itself, so it can save before and restore after.
  const theme = nav.querySelector('.sidebar-theme');
  // A fresh span, not a changed attribute: icx hydrates each node only once.
  // Watching data-theme keeps the icon right whichever button switched it.
  const showIcon = () => {
    const icon = ui.getTheme() === 'dark' ? 'moon' : 'sun';
    theme.innerHTML = `<span data-icon="${icon}" data-icon-size="16"></span>`;
  };
  showIcon();
  new MutationObserver(showIcon)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  ui.on(theme, 'click', () => {
    if (document.dispatchEvent(new CustomEvent('ge-maker:theme', { cancelable: true }))) {
      ui.toggleTheme();
    }
  });

  ui.sidebar(nav);
  return menu;
}

export default buildMenu;
