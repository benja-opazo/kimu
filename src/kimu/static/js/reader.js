import { $ } from './dom.js';

// Font family / size / document width controls, persisted and applied via CSS vars.
export function initReader() {
  const root = document.documentElement.style;
  const ff = localStorage.getItem('docs-font') || "'Inter', system-ui, -apple-system, sans-serif";
  const fs = parseInt(localStorage.getItem('docs-fontsize'), 10) || 16;
  const dw = parseInt(localStorage.getItem('docs-docwidth'), 10) || 70;

  root.setProperty('--doc-font', ff);
  root.setProperty('--doc-size', fs + 'px');
  root.setProperty('--doc-width', dw + '%');

  const fam = $('font-family'), size = $('font-size'), wid = $('doc-width');
  fam.value = ff; size.value = fs; wid.value = dw;

  fam.addEventListener('change', () => {
    root.setProperty('--doc-font', fam.value);
    localStorage.setItem('docs-font', fam.value);
  });
  size.addEventListener('input', () => {
    root.setProperty('--doc-size', size.value + 'px');
    localStorage.setItem('docs-fontsize', size.value);
  });
  wid.addEventListener('input', () => {
    root.setProperty('--doc-width', wid.value + '%');
    localStorage.setItem('docs-docwidth', wid.value);
  });

  const panel = $('font-panel'), btn = $('font-btn');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.hidden;
    document.querySelectorAll('.popover').forEach(p => p.hidden = true);  // close siblings
    panel.hidden = !open;
  });
  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) panel.hidden = true;
  });
}
