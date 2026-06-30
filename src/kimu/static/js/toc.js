import { $ } from './dom.js';

let tocContainer = null;
let spy = null;

export function clearToc() {
  if (spy) { spy.disconnect(); spy = null; }
  if (tocContainer) { tocContainer.remove(); tocContainer = null; }
  document.querySelectorAll('.file-item.has-toc')
    .forEach(el => el.classList.remove('has-toc', 'toc-collapsed'));
}

// Scroll to a heading by id, expanding its collapsed parent section first.
// `root` scopes the lookup to a single pane's #doc container.
export function scrollToId(id, root = document) {
  const h = root.querySelector(`[id="${CSS.escape(id)}"]`);
  if (!h) return;
  if (h.hidden) {
    let prev = h.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H2' && prev.classList.contains('collapsed')) { prev.click(); break; }
      if (prev.tagName === 'H1') break;
      prev = prev.previousElementSibling;
    }
  }
  h.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initScrollSpy(headings, tocById, scrollEl) {
  if (spy) spy.disconnect();
  const visible = new Set();
  spy = new IntersectionObserver(entries => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    let top = null, topY = Infinity;
    visible.forEach(h => { const y = h.getBoundingClientRect().top; if (y < topY) { topY = y; top = h; } });
    Object.values(tocById).forEach(i => i.classList.remove('active'));
    if (top && tocById[top.id]) tocById[top.id].classList.add('active');
  }, { root: scrollEl, rootMargin: '0px 0px -70% 0px', threshold: 0 });
  headings.forEach(h => spy.observe(h));
}

// Build the inline sidebar TOC for the active pane. `root` is its #doc
// container and `scrollEl` its scroll viewport (the scroll-spy root).
export function buildToc(root, scrollEl) {
  clearToc();
  const headings = [...root.querySelectorAll('h1, h2, h3')];
  if (!headings.length) return;
  const activeEl = document.querySelector('.file-item.active');
  if (!activeEl) return;

  const minLevel = Math.min(...headings.map(h => +h.tagName[1]));
  const container = document.createElement('div');
  container.className = 'toc-container';

  // Indent the TOC to match the active file's nesting depth in the tree, so a
  // nested file's TOC lines up under its (already-indented) file name.
  const depth = (activeEl.dataset.path || '').split('/').length - 1;
  container.style.setProperty('--toc-indent', (depth * 16) + 'px');

  const tocById = {};
  const currentChildrenEl = { 0: container };

  for (const h of headings) {
    const level = +h.tagName[1];
    const depth = Math.min(level - minLevel, 2);
    const parentEl = currentChildrenEl[depth] ?? container;

    const item = document.createElement('div');
    item.className = `toc-item h${depth + 1}`;

    const label = document.createElement('span');
    label.className = 'toc-label';
    label.textContent = h.dataset.title || h.textContent;
    tocById[h.id] = item;

    if (depth < 2) {
      const arrow = document.createElement('span');
      arrow.className = 'toc-arrow';
      arrow.textContent = '▶';
      const childWrap = document.createElement('div');
      childWrap.className = 'toc-children';

      if (level === 1) { item.classList.add('toc-open'); childWrap.classList.add('open'); }

      item.append(arrow, label);
      item.addEventListener('click', () => {
        scrollToId(h.id, root);
        if (childWrap.children.length > 0) {
          item.classList.toggle('toc-open');
          childWrap.classList.toggle('open');
        }
      });

      parentEl.append(item, childWrap);
      currentChildrenEl[depth + 1] = childWrap;
      for (let d = depth + 2; d <= 2; d++) currentChildrenEl[d] = null;
    } else {
      item.append(label);
      item.addEventListener('click', () => scrollToId(h.id, root));
      (parentEl ?? container).append(item);
    }
  }

  // Hide arrows on items whose childWrap ended up empty.
  container.querySelectorAll('.toc-arrow').forEach(arrow => {
    const childWrap = arrow.closest('.toc-item').nextElementSibling;
    if (!childWrap?.classList.contains('toc-children') || !childWrap.children.length) {
      arrow.style.visibility = 'hidden';
    }
  });

  activeEl.insertAdjacentElement('afterend', container);
  activeEl.classList.add('has-toc');
  tocContainer = container;
  initScrollSpy(headings, tocById, scrollEl);
}
