// js/ge-maker/hints.js — folds the explanatory prose away behind an icon.
//
// Every demo section carried three to five lines of <p class="out"> telling
// you what it is. Useful once, then permanently in the way — the page was
// mostly explanation with the thing being demonstrated pushed off-screen.
//
// A note marked <p class="out" data-note> is turned into a popover: the icon
// joins the section's heading, the prose only appears when asked for. A
// readout that JS writes into is not a note and is left alone, otherwise
// the demo would hide its own output.

import { ui } from '../ge2/ui.js';

// An attribute, not a class: this marks behaviour, not appearance — the same
// split the framework already uses for data-drawer, data-tab and data-icon.
const NOTE = '[data-note]';

// The popover API puts the panel in the top layer and handles Escape and
// click-outside itself. Where it is missing the note simply shows and hides
// in place — worse, but never a page with unreachable text.
const POPOVER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

const GAP = 6;   // between the icon and the panel
const EDGE = 8;  // between the panel and the viewport

/**
 * Park the panel under its icon, or above it when there is more room there,
 * and cap its height to the space that leaves. The CSS makes it scroll; this
 * decides how much of the note is on screen before it has to.
 */
function place(pop, anchor) {
  const r = anchor.getBoundingClientRect();

  const w = pop.offsetWidth;
  pop.style.left =
    `${Math.min(Math.max(EDGE, r.left), Math.max(EDGE, window.innerWidth - w - EDGE))}px`;

  const below = window.innerHeight - r.bottom - GAP - EDGE;
  const above = r.top - GAP - EDGE;

  // Flip only when below is genuinely too tight and above is roomier —
  // a note near the foot of a long page would otherwise get a few pixels.
  const flip = above > below && below < Math.min(pop.scrollHeight, 160);
  pop.style.maxHeight = `${Math.max(80, flip ? above : below)}px`;

  // read offsetHeight after maxHeight, so it is the clamped height
  pop.style.top = flip
    ? `${Math.max(EDGE, r.top - GAP - pop.offsetHeight)}px`
    : `${r.bottom + GAP}px`;
}

export function hints(root = document) {
  const notes = ui.els(NOTE, root);

  notes.forEach((note, i) => {
    // a popovertarget needs an id; keep one the markup already gave
    note.id ||= `hint-${i}`;
    note.classList.add('hint-pop');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hint-btn';
    btn.setAttribute('aria-label', 'What is this?');
    btn.innerHTML = '<span data-icon="info" data-icon-size="14"></span>';

    // On the heading line when the section has one, so the note costs no
    // vertical space at all; otherwise where the prose used to be.
    const head = note.parentElement?.querySelector(':scope > h2, :scope > h3');
    if (head) head.appendChild(btn);
    else note.parentElement?.insertBefore(btn, note);

    if (POPOVER) {
      note.setAttribute('popover', 'auto');
      btn.setAttribute('popovertarget', note.id);
      // `toggle`, not `beforetoggle`: the panel has no width until it shows
      ui.on(note, 'toggle', (e) => { if (e.newState === 'open') place(note, btn); });
    } else {
      note.hidden = true;
      note.classList.add('hint-inline');
      btn.setAttribute('aria-expanded', 'false');
      ui.on(btn, 'click', () => {
        note.hidden = !note.hidden;
        btn.setAttribute('aria-expanded', String(!note.hidden));
      });
    }
  });

  return notes.length;
}

export default hints;
