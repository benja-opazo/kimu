import { $ } from './dom.js';
import { onNavigate } from './store.js';
import { openOrActivate, reloadActive } from './buffers.js';

// Hash format: #<path>  or  #<path>::<heading-id>
function buildHash(path, heading) {
  return '#' + encodeURI(path) + (heading ? '::' + heading : '');
}
function parseHash() {
  const h = decodeURI(location.hash.slice(1));
  if (!h) return { path: null, heading: null };
  const i = h.indexOf('::');
  return i === -1 ? { path: h, heading: null } : { path: h.slice(0, i), heading: h.slice(i + 2) };
}

function applyHash() {
  const { path, heading } = parseHash();
  if (path) openOrActivate(path, heading);
}

export function initRouter(defaultPath) {
  onNavigate(({ path, heading }) => { location.hash = buildHash(path, heading); });
  window.addEventListener('hashchange', applyHash);

  $('reload-btn').addEventListener('click', () => {
    const btn = $('reload-btn');
    if (btn.disabled) return;
    btn.classList.add('spinning');
    btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    reloadActive();
  });

  const { path } = parseHash();
  if (path) applyHash();
  else if (defaultPath) location.hash = buildHash(defaultPath, null);
}
