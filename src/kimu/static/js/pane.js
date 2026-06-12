import { renderDoc } from './render.js';
import { buildToc, scrollToId } from './toc.js';

// A reading pane = a #doc container inside a scroll viewport. For now there is
// a single pane; keeping render/toc scoped to explicit elements lets more panes
// be added later (split view) without touching the rendering code.

export function createPane(docEl, scrollEl) {
  return { docEl, scrollEl, path: null };
}

export function renderInto(pane, buf, { heading = null, scrollText = null } = {}) {
  pane.path = buf.path;
  renderDoc(buf, pane.docEl);
  buildToc(pane.docEl, pane.scrollEl);

  if (heading) {
    requestAnimationFrame(() => scrollToId(heading, pane.docEl));
  } else {
    pane.scrollEl.scrollTop = buf.scrollTop || 0;
  }
  if (scrollText) scrollToText(pane.docEl, scrollText);
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
