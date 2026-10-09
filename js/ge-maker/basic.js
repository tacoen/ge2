// js/ge-maker/basic.js — forms and the utility demos.

import { ui } from '../ge2/ui.js';
import { out, tokenValue } from './util.js';

// ── form ──────────────────────────────────────────────
const form = ui.el('#demoForm');

ui.handleForm(form, async (data) => {
  // a File serialises as {} — show its name instead
  const show = (k, v) => (v instanceof File ? v.name || '(no file)' : v);
  out('formOut', `submitted: ${JSON.stringify(data, show)}`);
  return { ok: true };
});

// prepareForm ran inside handleForm — report the ids it generated.
const reportIds = () => {
  const ids = [...form.querySelectorAll('input, textarea, select')]
    .map(f => `${f.name || '(unnamed)'} -> #${f.id}`)
    .join('\n');
  out('formIds', `form name = ${form.getAttribute('name')}\n${ids}`);
};
reportIds();

// Inject a field after load, then re-prepare — the documented manual use.
ui.on(ui.el('#formInject'), 'click', () => {
  const wrap = document.createElement('label');
  wrap.textContent = 'Injected field';
  const input = document.createElement('input');
  input.type = 'text';
  input.name = `extra-${form.querySelectorAll('input').length}`;
  wrap.appendChild(input);
  ui.el('#formFields').appendChild(wrap);

  ui.prepareForm(form);
  reportIds();
});

// ── responsive readout ───────────────────────
// Read --bp-* from vars.css rather than restating the pixel values.
const BP_NAMES = ['sm', 'md', 'lg', 'xl', 'xxl'];
const queries = BP_NAMES
  .map((name) => ({ name, px: parseInt(tokenValue(`--bp-${name}`), 10) }))
  .filter(({ px }) => Number.isFinite(px))
  .map((bp) => ({ ...bp, mq: window.matchMedia(`(min-width: ${bp.px}px)`) }));

function showBreakpoint() {
  const active = queries.filter((q) => q.mq.matches);
  const current = active.length ? active[active.length - 1] : { name: 'xs', px: 0 };
  const suffixes = active.length ? active.map((q) => `-${q.name}`).join(' ') : '(none)';
  out('bpNow', `${window.innerWidth}px \u2192 ${current.name} (\u2265${current.px}px) \u00b7 active suffixes: ${suffixes}`);
}

for (const q of queries) ui.on(q.mq, 'change', showBreakpoint);
ui.on(window, 'resize', showBreakpoint);
showBreakpoint();
