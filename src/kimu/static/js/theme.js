import { $ } from './dom.js';
import { palette } from './icons.js';

// data-theme on <html> drives every theme (see styles.css). 'light' is the
// :root default. Order here is the order shown in the picker.
const THEMES = [
  { id: 'light',     label: 'Light' },
  { id: 'dark',      label: 'Dark' },
  { id: 'ayu-light', label: 'Ayu Light' },
  { id: 'ayu-dark',  label: 'Ayu Dark' },
  { id: 'alucard',   label: 'Alucard (Dracula Light)' },
  { id: 'dracula',   label: 'Dracula' },
  { id: 'synthwave', label: 'Synthwave' },
];
const IDS = THEMES.map(t => t.id);

export function initTheme() {
  let saved = localStorage.getItem('docs-theme') || 'light';
  if (!IDS.includes(saved)) saved = 'light';   // tolerate legacy/unknown values
  apply(saved);

  $('theme-btn').innerHTML = palette;
  const panel = $('theme-panel'), btn = $('theme-btn');
  panel.querySelectorAll('.theme-opt').forEach(opt =>
    opt.addEventListener('click', () => { apply(opt.dataset.theme); panel.hidden = true; })
  );

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.hidden;
    document.querySelectorAll('.popover').forEach(p => p.hidden = true);  // close siblings
    panel.hidden = !open;
  });
  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) panel.hidden = true;
  });
}

function apply(id) {
  document.documentElement.dataset.theme = id;
  localStorage.setItem('docs-theme', id);
  document.querySelectorAll('.theme-opt').forEach(o =>
    o.classList.toggle('selected', o.dataset.theme === id));
}
