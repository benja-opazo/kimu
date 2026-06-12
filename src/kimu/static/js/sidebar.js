import { $ } from './dom.js';
import { navigate } from './store.js';
import { getFiles } from './api.js';

// ── Folder open/closed state (persisted; default collapsed) ──────────────────

function folderOpen(path) {
  return localStorage.getItem('docs-folder:' + path) === '1';
}
function setFolderOpen(path, open) {
  localStorage.setItem('docs-folder:' + path, open ? '1' : '0');
}

// Open every ancestor folder of a file so the active item is revealed.
export function expandAncestors(path) {
  const parts = path.split('/');
  let prefix = '';
  for (let i = 0; i < parts.length - 1; i++) {
    prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
    document.querySelectorAll(`[data-dir="${CSS.escape(prefix)}"]`).forEach(el => el.classList.add('open'));
  }
}

export function setActive(path) {
  document.querySelectorAll('.file-item').forEach(el =>
    el.classList.toggle('active', el.dataset.path === path)
  );
}

// ── Tree build ───────────────────────────────────────────────────────────────

function buildTreeData(paths) {
  const root = { dirs: {}, files: [] };
  for (const p of paths) {
    const parts = p.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node.dirs[parts[i]] = node.dirs[parts[i]] || { dirs: {}, files: [] };
    }
    node.files.push({ path: p, name: parts[parts.length - 1] });
  }
  return root;
}

function fileEl(path, label) {
  const a = document.createElement('a');
  a.className    = 'file-item';
  a.textContent  = label.replace(/\.md$/, '');
  a.href         = '#';
  a.dataset.path = path;
  a.addEventListener('click', e => {
    e.preventDefault();
    if (a.classList.contains('active')) {
      // Re-clicking the open doc collapses/expands its inline TOC.
      const toc = document.querySelector('.toc-container');
      if (toc) a.classList.toggle('toc-collapsed', toc.classList.toggle('collapsed'));
    } else {
      navigate(path);
    }
  });
  return a;
}

function renderNode(node, parentEl, depth, prefix) {
  for (const name of Object.keys(node.dirs).sort()) {
    const dirPath = prefix ? `${prefix}/${name}` : name;
    const header  = document.createElement('div');
    const arrow   = document.createElement('span');
    const list    = document.createElement('div');

    arrow.className   = 'dir-arrow';
    arrow.textContent = '▶';
    header.className   = 'dir-header';
    header.dataset.dir = dirPath;
    header.style.paddingLeft = (12 + depth * 14) + 'px';
    header.append(arrow, `${name}/`);
    list.className     = 'dir-files';
    list.dataset.dir   = dirPath;

    if (folderOpen(dirPath)) { header.classList.add('open'); list.classList.add('open'); }
    header.addEventListener('click', () => {
      const open = header.classList.toggle('open');
      list.classList.toggle('open');
      setFolderOpen(dirPath, open);
    });

    parentEl.append(header, list);
    renderNode(node.dirs[name], list, depth + 1, dirPath);
  }

  for (const f of node.files.sort((a, b) => a.name.localeCompare(b.name))) {
    const el = fileEl(f.path, f.name.replace(/\.md$/, ''));
    el.style.paddingLeft = (depth === 0 ? 16 : 30 + (depth - 1) * 14) + 'px';
    parentEl.append(el);
  }
}

// ── Resize + collapse ────────────────────────────────────────────────────────

function initResizer() {
  const MIN = 160, MAX = 560;
  const saved = parseInt(localStorage.getItem('docs-sidebar-w'), 10);
  if (saved) {
    document.documentElement.style.setProperty('--sidebar-w', Math.min(MAX, Math.max(MIN, saved)) + 'px');
  }

  const resizer = $('resizer');
  let dragging = false;

  resizer.addEventListener('mousedown', e => {
    dragging = true;
    resizer.classList.add('dragging');
    document.body.classList.add('resizing');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const w = Math.min(MAX, Math.max(MIN, e.clientX));   // sidebar starts at x=0
    document.documentElement.style.setProperty('--sidebar-w', w + 'px');
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.classList.remove('resizing');
    const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w'), 10);
    localStorage.setItem('docs-sidebar-w', w);
  });
}

function initCollapse() {
  const isMobile = () => window.matchMedia('(max-width: 680px)').matches;
  if (localStorage.getItem('docs-sidebar-collapsed') === '1') {
    $('app').classList.add('sidebar-collapsed');
  }
  $('menu-btn').addEventListener('click', () => {
    if (isMobile()) {
      $('sidebar').classList.toggle('open');                 // overlay
    } else {
      const collapsed = $('app').classList.toggle('sidebar-collapsed');
      localStorage.setItem('docs-sidebar-collapsed', collapsed ? '1' : '0');
    }
  });
}

export async function initSidebar() {
  const paths = await getFiles();
  $('tree').innerHTML = '';
  renderNode(buildTreeData(paths), $('tree'), 0, '');
  initResizer();
  initCollapse();
  return paths;
}
