// Small shared helpers.

export const $ = id => document.getElementById(id);

// GitHub-style heading slug. Mirrors the Python slugify used to build
// decisions/INDEX.md, so cross-doc anchor links resolve to real heading ids.
export function slugify(t) {
  return t.trim().toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function escapeHtml(s) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Flash a transient toolbar status message (the green #saved span). Used for
// both "Saved ✓" (on edit) and "Reloaded!" (on reload).
export function flashStatus(text) {
  const el = $('saved');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 1800);
}
