// js/ge2/ui.js — ge2 UI helpers, exported as `ui` (and default).
// Ported from the ge project's js/geui.js; static-only class so call sites
// read `ui.toast(...)`. API and markup contracts in readme.md.

import { config } from './config.js';
import { store } from './store.js';

export const VERSION = '0.1.0';

const TAG = '[ge2/ui]';

// 'Ctrl+K' / 'Escape' / 'Shift+Space' -> normalized shape for onKey().
const KEY_ALIASES = {
  space: ' ',
  esc: 'escape',
  del: 'delete',
  ins: 'insert',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class GeUI {
  // ==================== DOM ====================
  static el(sel, root = document) { return root.querySelector(sel); }
  static els(sel, root = document) { return [...root.querySelectorAll(sel)]; }

  static show(el) { if (el) el.style.display = ''; }
  static hide(el) { if (el) el.style.display = 'none'; }
  static toggle(el) { if (el) el.style.display = el.style.display === 'none' ? '' : 'none'; }

  static addClass(el, cls) { el?.classList.add(cls); }
  static removeClass(el, cls) { el?.classList.remove(cls); }
  static toggleClass(el, cls) { el?.classList.toggle(cls); }

  static on(el, ev, fn, opt) { el?.addEventListener(ev, fn, opt); }
  static off(el, ev, fn, opt) { el?.removeEventListener(ev, fn, opt); }

  // ==================== ERROR HANDLER ====================
  static error(msg, err = null) {
    const full = `${TAG} ${msg}`;
    console.error(full, err || '');
    GeUI.toast(full, 'error', 5000);
  }

  // ==================== COPY ====================
  // ui.copy(btn, target, { success, duration }) — execCommand, not the
  // clipboard API, so it works on plain http:// origins too.
  static copy(btn, target, options = {}) {
    if (!btn || !target) return;
    const { success = 'Copied!', duration = 1500 } = options;

    GeUI.on(btn, 'click', () => {
      const label = btn.textContent;
      try {
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
          target.select();
          target.setSelectionRange(0, 99999);
        } else {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(target);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        const ok = document.execCommand('copy');
        window.getSelection()?.removeAllRanges();

        if (ok) {
          btn.textContent = success;
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = label;
            btn.disabled = false;
          }, duration);
        }
      } catch (e) {
        GeUI.error('Copy failed', e);
      }
    });
  }

  // ==================== KEYBOARD SHORTCUTS ====================
  static _combo(combo) {
    const parts = String(combo).split('+').map(p => p.trim()).filter(Boolean);
    const raw = (parts.pop() ?? '').toLowerCase();
    const mods = new Set(parts.map(m => m.toLowerCase()));

    return {
      ctrl: mods.has('ctrl') || mods.has('control'),
      alt: mods.has('alt'),
      shift: mods.has('shift'),
      meta: mods.has('meta') || mods.has('cmd') || mods.has('command'),
      key: KEY_ALIASES[raw] ?? raw,
    };
  }

  // Returns an unbind function.
  static onKey(combo, callback, options = {}) {
    const { target = document, preventDefault = true } = options;
    const want = GeUI._combo(combo);

    const handler = (e) => {
      if (e.ctrlKey !== want.ctrl) return;
      if (e.altKey !== want.alt) return;
      if (e.shiftKey !== want.shift) return;
      if (e.metaKey !== want.meta) return;
      if ((e.key || '').toLowerCase() !== want.key) return;

      if (preventDefault) e.preventDefault();
      callback(e);
    };

    GeUI.on(target, 'keydown', handler);
    return () => GeUI.off(target, 'keydown', handler);
  }

  // ==================== THEME ====================
  // Storage going through store.set matters: an unguarded setItem throws in
  // a private window, and the old catch reported "Failed to set theme" even
  // though the theme had already been applied.
  static setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    document.documentElement.setAttribute('data-theme', theme);
    store.set(config.themeStorageKey, theme);
  }

  static getTheme() {
    return document.documentElement.getAttribute('data-theme');
  }

  static toggleTheme() {
    GeUI.setTheme(GeUI.getTheme() === 'dark' ? 'light' : 'dark');
    return GeUI.getTheme();
  }

  // Remembered choice wins, else config.theme ('auto' defers to the OS).
  // The stored value is validated: a corrupt one used to leave no theme set.
  static initTheme() {
    try {
      // store.get returns null rather than throwing, so unreadable storage
      // falls through to config.theme instead of leaving no theme at all
      const saved = store.get(config.themeStorageKey);
      if (saved === 'light' || saved === 'dark') {
        GeUI.setTheme(saved);
        return;
      }

      if (config.theme === 'light' || config.theme === 'dark') {
        GeUI.setTheme(config.theme);
        return;
      }

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      GeUI.setTheme(isDark ? 'dark' : 'light');
    } catch (e) {
      GeUI.error('Theme init failed', e);
    }
  }

  // ==================== TOAST ====================
  static toast(msg, type = 'info', duration = 3000) {
    try {
      let container = GeUI.el('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = msg;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, duration);

      return toast;
    } catch (e) {
      console.error(`${TAG} Toast failed`, e);
    }
  }

  // ==================== FORM ====================
  // Give the form a name and every field a unique id + wired label. Called
  // by handleForm; safe to call again after injecting fields.
  static prepareForm(form) {
    if (!form) return;

    // Attributes, never the properties: HTMLFormElement's named getter is
    // [LegacyOverrideBuiltIns], so a control called "name" or "id" shadows
    // form.name / form.id and yields an element, not a string.
    let formName = form.getAttribute('name');
    if (!formName) {
      formName = form.getAttribute('id') || `form-${Math.random().toString(36).slice(2, 7)}`;
      form.setAttribute('name', formName);
    }

    // Track every id already in the document so we never collide.
    const usedIds = new Set(GeUI.els('[id]').map(el => el.getAttribute('id')));
    const fields = form.querySelectorAll('input, textarea, select');

    fields.forEach(field => {
      if (field.id) return; // already has one — leave it alone

      const base = (field.name || field.type || field.tagName.toLowerCase())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let candidate = `${formName}-${base}`;
      let suffix = 2;
      while (usedIds.has(candidate)) candidate = `${formName}-${base}-${suffix++}`;

      field.id = candidate;
      usedIds.add(candidate);

      // wrapping label, label[for=<name>], or a bare preceding label
      const prev = field.previousElementSibling;
      const label =
        field.closest('label') ??
        form.querySelector(`label[for="${field.name}"]`) ??
        (prev?.matches?.('label') && !prev.htmlFor ? prev : null);

      if (label && !label.htmlFor) label.htmlFor = field.id;
    });
  }

  // Off the prototype: a control named "reset" or "checkValidity" shadows
  // the method itself. Resolved via the form's own document, so it holds
  // across iframes without leaning on a global.
  static _formCall(form, method) {
    const proto = form.ownerDocument?.defaultView?.HTMLFormElement?.prototype;
    return (proto?.[method] ?? form[method]).call(form);
  }

  static handleForm(form, onSuccess) {
    if (!form) return;
    try {
      form.noValidate = false;

      // Guarantee accessible ids/names before the first submit attempt.
      GeUI.prepareForm(form);

      GeUI.on(form, 'submit', async e => {
        e.preventDefault();

        if (!GeUI._formCall(form, 'checkValidity')) {
          GeUI._formCall(form, 'reportValidity');
          GeUI.toast('Please fix the errors', 'error');
          return;
        }

        try {
          const data = Object.fromEntries(new FormData(form));
          const result = await onSuccess(data, form);
          if (result?.ok || result === true) {
            GeUI.toast('Success!', 'success');
            GeUI._formCall(form, 'reset');
          }
        } catch (err) {
          GeUI.error('Form submission error', err);
        }
      });
    } catch (e) {
      GeUI.error('Failed to setup form handler', e);
    }
  }

  // ==================== TABS ====================
  // <ul class="tabmenu" data-scope="panels"><li data-tab="one">…</li></ul>
  // <div id="panels"><section class="tab" id="one">…</section></div>  
  static tabs(selector = '.tabmenu') {
    try {
      GeUI.els(selector).forEach(menu => {
        menu.setAttribute('role', 'tablist');

        const tabs = menu.querySelectorAll('li');
        const container = menu.dataset.scope ? document.getElementById(menu.dataset.scope) : null;

        tabs.forEach((tab, index) => {
          tab.setAttribute('role', 'tab');
          tab.setAttribute('tabindex', '0');
          tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
          if (tab.dataset.tab) tab.setAttribute('aria-controls', tab.dataset.tab);

          GeUI.on(tab, 'click', () => GeUI._activateTab(tab, tabs, container));
          GeUI.on(tab, 'keydown', e => GeUI._tabKeyboard(e, tab, index, tabs, container));
        });

        if (container) {
          container.querySelectorAll('.tab').forEach(panel => {
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('tabindex', '0');
          });
        }

        // activate the first tab if the markup marked none
        if (!menu.querySelector('li.active') && tabs.length > 0) {
          GeUI._activateTab(tabs[0], tabs, container);
        }
      });
    } catch (e) {
      GeUI.error('Tabs initialization failed', e);
    }
  }

  static _activateTab(tab, tabs, container) {
    tabs.forEach(t => {
      GeUI.removeClass(t, 'active');
      t.setAttribute('aria-selected', 'false');
    });

    GeUI.addClass(tab, 'active');
    tab.setAttribute('aria-selected', 'true');

    if (!container) return;

    container.querySelectorAll('.tab').forEach(p => {
      GeUI.removeClass(p, 'active');
      p.setAttribute('hidden', 'true');
    });

    const id = tab.dataset.tab;
    const target = id ? container.querySelector(`#${CSS.escape(id)}`) : null;
    if (target) {
      GeUI.addClass(target, 'active');
      target.removeAttribute('hidden');
    }
  }

  static _tabKeyboard(e, tab, index, tabs, container) {
    const count = tabs.length;
    const go = (el) => { el.focus(); GeUI._activateTab(el, tabs, container); };

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        go(tabs[(index + 1) % count]);
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        go(tabs[(index - 1 + count) % count]);
        break;

      case 'Home':
        e.preventDefault();
        go(tabs[0]);
        break;

      case 'End':
        e.preventDefault();
        go(tabs[count - 1]);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        GeUI._activateTab(tab, tabs, container);
        break;
    }
  }

  // ==================== ACCORDION ====================
  // <div class="accordion" [data-single]><div class="accordion-item">
  //   <div class="accordion-header">…</div><div class="accordion-content">…</div>
  static accordion(selector = '.accordion') {
    try {
      GeUI.els(selector).forEach(accordion => {
        GeUI.on(accordion, 'click', e => {
          const header = e.target.closest('.accordion-header');
          if (!header || !accordion.contains(header)) return;
          GeUI._toggleAccordionItem(header, accordion);
        });

        GeUI.on(accordion, 'keydown', e => {
          const header = e.target.closest('.accordion-header');
          if (!header || !accordion.contains(header)) return;

          const headers = accordion.querySelectorAll('.accordion-header');
          const index = [...headers].indexOf(header);
          GeUI._accordionKeyboard(e, header, index, headers, accordion);
        });

        accordion.querySelectorAll('.accordion-header').forEach(header => {
          header.setAttribute('tabindex', '0');
          header.setAttribute('role', 'button');
          header.setAttribute(
            'aria-expanded',
            header.parentElement.classList.contains('active') ? 'true' : 'false'
          );

          const content = header.nextElementSibling;
          if (content) content.setAttribute('role', 'region');
        });
      });
    } catch (e) {
      GeUI.error('Accordion initialization failed', e);
    }
  }

  static _toggleAccordionItem(header, accordion) {
    const item = header.parentElement;
    const isOpen = item.classList.contains('active');

    if (accordion.hasAttribute('data-single') && !isOpen) {
      accordion.querySelectorAll('.accordion-item.active').forEach(i => {
        GeUI.removeClass(i, 'active');
        i.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
      });
    }

    GeUI.toggleClass(item, 'active');
    header.setAttribute('aria-expanded', String(!isOpen));
  }

  static _accordionKeyboard(e, header, index, headers, accordion) {
    const count = headers.length;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        GeUI._toggleAccordionItem(header, accordion);
        break;

      case 'ArrowDown':
        e.preventDefault();
        headers[(index + 1) % count].focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        headers[(index - 1 + count) % count].focus();
        break;

      case 'Home':
        e.preventDefault();
        headers[0].focus();
        break;

      case 'End':
        e.preventDefault();
        headers[count - 1].focus();
        break;

      case 'Escape': {
        const item = header.parentElement;
        if (item.classList.contains('active')) {
          GeUI.removeClass(item, 'active');
          header.setAttribute('aria-expanded', 'false');
        }
        break;
      }
    }
  }

  // ==================== MENUS ====================
  // Shared close-on-outside-click / Escape behaviour for dropdowns and
  // context menus. Registered once per menu; returns the closer.
  static _dismissable(menu, close) {
    const onDown = (e) => { if (!menu.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    GeUI.on(document, 'pointerdown', onDown);
    GeUI.on(document, 'keydown', onKey);
    return () => {
      GeUI.off(document, 'pointerdown', onDown);
      GeUI.off(document, 'keydown', onKey);
    };
  }

  // <div class="dropdown">
  //   <button class="dropdown-toggle">Actions</button>
  //   <ul class="dropdown-menu"><li><button>Rename</button></li></ul>
  // </div>
  static dropdown(selector = '.dropdown') {
    try {
      GeUI.els(selector).forEach((root) => {
        const toggle = root.querySelector('.dropdown-toggle');
        const menu = root.querySelector('.dropdown-menu');
        if (!toggle || !menu) return;

        const set = (open) => {
          root.classList.toggle('open', open);
          toggle.setAttribute('aria-expanded', String(open));
          menu.hidden = !open;
        };
        set(false);
        toggle.setAttribute('aria-haspopup', 'true');

        GeUI._dismissable(root, () => set(false));
        GeUI.on(toggle, 'click', (e) => {
          e.stopPropagation();                 // our own pointerdown would reclose it
          set(!root.classList.contains('open'));
        });
        // choosing an item closes the menu; the app handles the click itself
        GeUI.on(menu, 'click', (e) => { if (e.target.closest('button, a')) set(false); });
      });
    } catch (e) {
      GeUI.error('Dropdown initialization failed', e);
    }
  }

  // <div data-contextmenu="fileMenu">right-click me</div>
  // <ul class="contextmenu" id="fileMenu"><li><button>Open</button></li></ul>
  //
  // Opens at the pointer, clamped so it never hangs off the viewport.
  static contextmenu(selector = '.contextmenu') {
    try {
      GeUI.els(selector).forEach((menu) => {
        const id = menu.id;
        if (!id) { GeUI.error('Context menu needs an id'); return; }

        const close = () => { menu.classList.remove('open'); menu.hidden = true; };
        close();
        menu.setAttribute('role', 'menu');

        const openAt = (x, y) => {
          menu.hidden = false;
          menu.classList.add('open');
          // measure first, then clamp: the menu has no size while hidden
          const { offsetWidth: w, offsetHeight: h } = menu;
          const maxX = (window.innerWidth || 0) - w - 4;
          const maxY = (window.innerHeight || 0) - h - 4;
          menu.style.left = `${Math.max(4, Math.min(x, maxX))}px`;
          menu.style.top = `${Math.max(4, Math.min(y, maxY))}px`;
          menu.querySelector(FOCUSABLE)?.focus();
        };

        GeUI.els(`[data-contextmenu="${CSS.escape(id)}"]`).forEach((host) => {
          GeUI.on(host, 'contextmenu', (e) => {
            e.preventDefault();
            openAt(e.clientX, e.clientY);
          });
        });

        GeUI._dismissable(menu, close);
        GeUI.on(menu, 'click', (e) => { if (e.target.closest('button, a')) close(); });
        GeUI.on(window, 'blur', close);
      });
    } catch (e) {
      GeUI.error('Context menu initialization failed', e);
    }
  }

  // ==================== DRAWER ====================
  // <button data-drawer="nav">open</button>
  // <div class="drawer-scrim" data-drawer-for="nav"></div>
  // <aside class="drawer" id="nav">…</aside>
  //
  // Any [data-drawer="<id>"] toggles that drawer; the scrim and Escape close
  // it. Separate from modal(): a drawer is navigation furniture, not a
  // focus-trapping dialog, so it does not move the element or trap Tab.
  static drawer(selector = '.drawer') {
    try {
      GeUI.els(selector).forEach((panel) => {
        const id = panel.id;
        if (!id) { GeUI.error('Drawer needs an id'); return; }

        const scrim = GeUI.el(`.drawer-scrim[data-drawer-for="${CSS.escape(id)}"]`);
        const set = (open) => {
          panel.classList.toggle('open', open);
          scrim?.classList.toggle('open', open);
          panel.setAttribute('aria-hidden', String(!open));
          GeUI.els(`[data-drawer="${CSS.escape(id)}"]`)
            .forEach((b) => b.setAttribute('aria-expanded', String(open)));
          if (open) panel.querySelector(FOCUSABLE)?.focus();
        };

        set(panel.classList.contains('open'));

        GeUI.els(`[data-drawer="${CSS.escape(id)}"]`).forEach((btn) => {
          btn.setAttribute('aria-controls', id);
          GeUI.on(btn, 'click', () => set(!panel.classList.contains('open')));
        });

        GeUI.on(scrim, 'click', () => set(false));
        GeUI.on(document, 'keydown', (e) => {
          if (e.key === 'Escape' && panel.classList.contains('open')) set(false);
        });
      });
    } catch (e) {
      GeUI.error('Drawer initialization failed', e);
    }
  }

  // ==================== SIDEBAR ====================
  // <nav class="sidebar">
  //   <button class="sidebar-toggle" type="button">…</button>
  //   <ul class="sidebar-nav">
  //     <li><a href="#tokens">Token</a></li>
  //     <li><a href="#components">Component</a>
  //       <ul><li><a href="#toast">Toast</a></li></ul></li>
  //   </ul>
  // </nav>
  //
  // Collapses the whole rail, folds each group with a nested <ul>, and marks
  // the link whose section is on screen. Anchors stay real links, so they
  // work with JS off and honour ctrl/middle-click.
  // `target` may be a selector or the element itself — a nav built in JS is
  // usually to hand, and passing it where a selector was expected silently
  // stringifies into an invalid selector.
  static sidebar(target = '.sidebar', options = {}) {
    try {
      const { collapseOn = 575.98 } = options;
      const roots = typeof target === 'string' ? GeUI.els(target) : [target].filter(Boolean);

      roots.forEach((nav) => {
        const narrow = () => window.matchMedia(`(max-width: ${collapseOn}px)`).matches;

        // ── rail toggle ──
        const toggle = nav.querySelector('.sidebar-toggle');
        const setOpen = (open) => {
          nav.classList.toggle('collapsed', !open);
          toggle?.setAttribute('aria-expanded', String(open));
        };
        if (toggle) {
          toggle.setAttribute('aria-controls', nav.id || '');
          setOpen(!nav.classList.contains('collapsed'));
          GeUI.on(toggle, 'click', () => setOpen(nav.classList.contains('collapsed')));
        }

        // ── groups: an <li> holding a nested <ul> ──
        const groups = [...nav.querySelectorAll('li')].filter((li) => li.querySelector('ul'));
        groups.forEach((li) => {
          GeUI.addClass(li, 'sidebar-group');
          const label = li.querySelector('a');
          label?.setAttribute('aria-expanded', String(li.classList.contains('open')));
          GeUI.on(label, 'click', () => {
            GeUI.addClass(li, 'open');                 // navigating in always opens
            label.setAttribute('aria-expanded', 'true');
          });
        });

        // ── links ──
        const links = [...nav.querySelectorAll('a[href^="#"]')];
        const byId = new Map();
        for (const a of links) {
          const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
          if (target) byId.set(target, a);
          // on a phone the rail covers the page — get out of the way
          GeUI.on(a, 'click', () => { if (narrow()) setOpen(false); });
        }

        // ── which section is on screen ──
        const IO = window.IntersectionObserver;
        if (byId.size && IO) {
          const mark = (a) => {
            links.forEach((l) => GeUI.removeClass(l, 'active'));
            if (!a) return;
            GeUI.addClass(a, 'active');
            const group = a.closest('li')?.parentElement?.closest('li');
            if (group) GeUI.addClass(group, 'open');
          };

          const seen = new Set();
          const io = new IO((entries) => {
            for (const e of entries) {
              if (e.isIntersecting) seen.add(e.target);
              else seen.delete(e.target);
            }
            // topmost visible section wins
            const first = [...byId.keys()]
              .filter((el) => seen.has(el))
              .sort((a, b) => a.compareDocumentPosition(b) & 4 ? -1 : 1)[0];
            if (first) mark(byId.get(first));
          }, { rootMargin: '0px 0px -60% 0px', threshold: 0 });

          byId.forEach((_, target) => io.observe(target));
          nav._sidebarObserver = io;
        }

        if (narrow()) setOpen(false);
      });
    } catch (e) {
      GeUI.error('Sidebar initialization failed', e);
    }
  }

  // ==================== MODAL ====================
  // ui.modal('open' | 'close' | 'destroy', 'modal-id')
  static modal(action, modalId) {
    try {
      const modal = GeUI.el(`#${CSS.escape(modalId)}`);
      if (!modal) {
        GeUI.error(`Modal #${modalId} not found`);
        return;
      }

      const overlay = GeUI.createOverlay();

      if (action === 'open') {
        GeUI._lastFocused = document.activeElement;
        if (modal.parentNode !== overlay) overlay.appendChild(modal);

        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        GeUI.show(overlay);
        GeUI.show(modal);
        GeUI.addClass(overlay, 'active');
        GeUI.addClass(modal, 'active');

        GeUI.trapFocus(modal);
      } else if (action === 'close') {
        GeUI.releaseFocus();
        GeUI.hide(modal);
        GeUI.hide(overlay);
        GeUI.removeClass(modal, 'active');
        GeUI.removeClass(overlay, 'active');
        modal.setAttribute('aria-modal', 'false');

        GeUI._lastFocused?.focus?.();
        delete GeUI._lastFocused;
      } else if (action === 'destroy') {
        GeUI.releaseFocus();
        modal.remove();
      }
    } catch (e) {
      GeUI.error(`Modal ${action} failed`, e);
    }
  }

  static trapFocus(modal) {
    GeUI.releaseFocus(); // never stack traps across opens

    const handler = (e) => {
      if (e.key === 'Escape') { GeUI.modal('close', modal.id); return; }
      if (e.key !== 'Tab') return;

      // re-read each Tab: content may have changed since open
      const focusable = [...modal.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (focusable.length === 0) { e.preventDefault(); return; }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };

    // on document, not the modal, so Escape works when focus wanders out
    GeUI.on(document, 'keydown', handler);
    GeUI._trapHandler = handler;

    modal.querySelector(FOCUSABLE)?.focus();
  }

  static releaseFocus() {
    if (GeUI._trapHandler) {
      GeUI.off(document, 'keydown', GeUI._trapHandler);
      delete GeUI._trapHandler;
    }
  }

  static createOverlay() {
    let overlay = GeUI.el('.overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'overlay';
      document.body.appendChild(overlay);

      GeUI.on(overlay, 'click', e => {
        if (e.target !== overlay) return;
        const active = GeUI.el('.modal.active');
        if (active) GeUI.modal('close', active.id);
      });
    }
    return overlay;
  }
}

// Applied at import so the page never flashes the wrong palette. Nothing
// else auto-runs — tabs/accordion/form wiring is the page's call.
try {
  GeUI.initTheme();
} catch (e) {
  console.error(`${TAG} Initialization failed`, e);
}

export const ui = GeUI;
export default GeUI;
