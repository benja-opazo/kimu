import { $, debounce, escapeHtml } from './dom.js';
import { search as apiSearch } from './api.js';
import { navigate } from './store.js';
import { requestScrollText } from './buffers.js';

function highlight(text, q) {
  const e = escapeHtml(text);
  const i = e.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? e : e.slice(0, i) + '<mark>' + e.slice(i, i + q.length) + '</mark>' + e.slice(i + q.length);
}

function renderResults(matches, q, results, close) {
  results.innerHTML = '';
  if (!matches.length) { results.innerHTML = '<div class="sr-empty">No matches</div>'; return; }

  let lastPath = null;
  for (const m of matches) {
    if (m.path !== lastPath) {
      const f = document.createElement('div');
      f.className = 'sr-file';
      f.textContent = m.path.replace(/\.md$/, '');
      results.appendChild(f);
      lastPath = m.path;
    }
    const row = document.createElement('div');
    row.className = 'sr-line';
    row.innerHTML = highlight(m.text, q);
    row.addEventListener('click', () => { requestScrollText(m.text); navigate(m.path); close(); });
    results.appendChild(row);
  }
}

export function initSearch() {
  const overlay = $('search-overlay'), input = $('search-input'),
        results = $('search-results'), btn = $('search-btn');

  const open  = () => { overlay.hidden = false; input.value = ''; results.innerHTML = ''; input.focus(); };
  const close = () => { overlay.hidden = true; };

  btn.addEventListener('click', open);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && !overlay.hidden) close();
  });

  const run = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ''; return; }
    renderResults(await apiSearch(q), q, results, close);
  }, 180);
  input.addEventListener('input', run);

  // Arrow-key navigation through results.
  input.addEventListener('keydown', e => {
    const rows = [...results.querySelectorAll('.sr-line')];
    if (!rows.length) return;
    let idx = rows.findIndex(r => r.classList.contains('sel'));
    if (e.key === 'ArrowDown')      { e.preventDefault(); idx = Math.min(rows.length - 1, idx + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); idx = Math.max(0, idx < 0 ? 0 : idx - 1); }
    else if (e.key === 'Enter')     { e.preventDefault(); (rows[idx] || rows[0]).click(); return; }
    else return;
    rows.forEach(r => r.classList.remove('sel'));
    rows[idx].classList.add('sel');
    rows[idx].scrollIntoView({ block: 'nearest' });
  });
}
