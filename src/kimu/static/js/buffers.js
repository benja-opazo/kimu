import { $, flashStatus } from './dom.js';
import { state, getBuffer, navigate } from './store.js';
import { getFile } from './api.js';
import { createPane, renderInto, captureScrollAnchor } from './pane.js';
import { setActive, expandAncestors } from './sidebar.js';
import { clearToc, scrollToId } from './toc.js';

// The buffer manager owns the open documents (state.buffers), the tab strip,
// and the single reading pane. It is the only navigation listener.

let pane = null;
let pendingScrollText = null;

export function initBuffers() {
  pane = createPane($('doc'), $('scroll'));
  renderTabs();
}

// Search results scroll to a snippet once the target doc has rendered.
export function requestScrollText(text) { pendingScrollText = text; }

function saveActiveScroll() {
  const buf = state.activePath && getBuffer(state.activePath);
  if (buf && pane) buf.scrollTop = pane.scrollEl.scrollTop;
}

async function ensureBuffer(path) {
  let buf = getBuffer(path);
  if (!buf) {
    const raw = await getFile(path);
    buf = { path, raw, cbLineMap: [], scrollTop: 0 };
    state.buffers.set(path, buf);   // insertion order = tab order
  }
  return buf;
}

function updateChrome(path) {
  $('crumb').textContent = path.replace(/\//g, ' › ').replace(/\.md$/, '');
  expandAncestors(path);
  setActive(path);
  $('reload-btn').disabled = false;
  $('sidebar').classList.remove('open');
}

// Open the doc as a tab if needed, then make it the active pane.
export async function openOrActivate(path, heading) {
  if (state.activePath === path && getBuffer(path)) {
    if (heading) scrollToId(heading, pane.docEl);
    return;
  }
  saveActiveScroll();
  const scrollText = pendingScrollText; pendingScrollText = null;
  const buf = await ensureBuffer(path);
  state.activePath = path;
  updateChrome(path);
  renderInto(pane, buf, { heading, scrollText });
  renderTabs();
}

export async function reloadActive() {
  const path = state.activePath;
  if (!path) return;
  const buf = getBuffer(path);
  if (!buf) return;
  const anchor = captureScrollAnchor(pane);    // capture position before content changes
  buf.scrollTop = pane.scrollEl.scrollTop;      // pixel fallback for restore
  buf.raw = await getFile(path);
  renderInto(pane, buf, { scrollAnchor: anchor });
  flashStatus('Reloaded!');
}

// Reload a buffer's content from disk. The active pane re-renders in place
// (preserving scroll); a background tab just refreshes its raw so the next
// activation shows fresh content. Used by the watch/autoreload feature.
export async function reloadBuffer(path) {
  const buf = getBuffer(path);
  if (!buf) return;
  if (path === state.activePath) { await reloadActive(); return; }
  buf.raw = await getFile(path);
}

export function closeBuffer(path) {
  if (!state.buffers.has(path)) return;
  const keys = [...state.buffers.keys()];
  const idx = keys.indexOf(path);
  const wasActive = state.activePath === path;
  state.buffers.delete(path);

  if (!wasActive) {
    renderTabs();
    return;
  }

  const remaining = [...state.buffers.keys()];
  if (remaining.length) {
    // Activate the neighbour (prefer the one to the right) via the hash, so the
    // URL stays in sync; openOrActivate re-renders the tab strip.
    navigate(remaining[Math.min(idx, remaining.length - 1)]);
  } else {
    state.activePath = null;
    pane.path = null;
    pane.docEl.innerHTML = '';
    clearToc();
    setActive(null);
    $('crumb').textContent = '';
    $('reload-btn').disabled = true;
    location.hash = '';
    renderTabs();
  }
}

// ── Tab strip ────────────────────────────────────────────────────────────────

function renderTabs() {
  const bar = $('tabs');
  bar.innerHTML = '';
  bar.hidden = state.buffers.size === 0;

  for (const path of state.buffers.keys()) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (path === state.activePath ? ' active' : '');
    tab.dataset.path = path;
    tab.title = path;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = path.split('/').pop().replace(/\.md$/, '');

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = 'Close tab';
    close.addEventListener('click', e => { e.stopPropagation(); closeBuffer(path); });

    tab.addEventListener('click', () => { if (path !== state.activePath) navigate(path); });
    tab.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); closeBuffer(path); } });

    tab.append(label, close);
    bar.append(tab);
  }
}
