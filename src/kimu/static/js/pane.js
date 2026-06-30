import { renderDoc } from './render.js';
import { buildToc, scrollToId } from './toc.js';

// A reading pane = a #doc container inside a scroll viewport. For now there is
// a single pane; keeping render/toc scoped to explicit elements lets more panes
// be added later (split view) without touching the rendering code.

export function createPane(docEl, scrollEl) {
  return { docEl, scrollEl, path: null };
}

export function renderInto(pane, buf, { heading = null, scrollText = null, scrollAnchor = null } = {}) {
  pane.path = buf.path;
  renderDoc(buf, pane.docEl);
  buildToc(pane.docEl, pane.scrollEl);

  if (heading) {
    requestAnimationFrame(() => scrollToId(heading, pane.docEl));
  } else if (scrollAnchor) {
    requestAnimationFrame(() => restoreScrollAnchor(pane, scrollAnchor, buf.scrollTop || 0));
  } else {
    pane.scrollEl.scrollTop = buf.scrollTop || 0;
  }
  if (scrollText) scrollToText(pane.docEl, scrollText);
}

// Position relative to the scroll viewport's content (≈ offsetTop, but robust
// to offsetParent quirks).
function topWithinScroll(el, scrollEl) {
  return el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop;
}

// Capture the current reading position as an anchor: the last heading at/above
// the viewport top, plus the pixel delta from that heading to the viewport top.
// Returns null when scrolled above the first heading (caller falls back to px).
export function captureScrollAnchor(pane) {
  const { scrollEl, docEl } = pane;
  const top = scrollEl.scrollTop;
  let anchor = null;
  docEl.querySelectorAll('h1, h2, h3').forEach(h => {
    const hTop = topWithinScroll(h, scrollEl);
    if (hTop <= top + 1) anchor = { id: h.id, hTop };   // last one above the fold wins
  });
  return anchor ? { id: anchor.id, delta: top - anchor.hTop } : null;
}

// Restore from an anchor: re-find the heading by id and offset by the saved
// delta. If the heading is gone, fall back to the raw pixel position.
function restoreScrollAnchor(pane, anchor, pixelFallback) {
  const { scrollEl, docEl } = pane;
  const h = docEl.querySelector(`[id="${CSS.escape(anchor.id)}"]`);
  if (!h) { scrollEl.scrollTop = pixelFallback; return; }
  scrollEl.scrollTop = Math.max(0, topWithinScroll(h, scrollEl) + anchor.delta);
}

// Scroll to (and flash) the first element whose text contains a search snippet.
function scrollToText(root, text) {
  const needle = text.trim().toLowerCase().slice(0, 60);
  if (!needle) return;
  const els = root.querySelectorAll('p, li, td, h1, h2, h3, pre, blockquote');
  for (const el of els) {
    if (el.offsetParent !== null && el.textContent.toLowerCase().includes(needle)) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('search-hit');
      setTimeout(() => el.classList.remove('search-hit'), 2000);
      break;
    }
  }
}
