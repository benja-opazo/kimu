import { $, slugify } from './dom.js';
import { navigate } from './store.js';
import { saveFile } from './api.js';
import { scrollToId } from './toc.js';
import { admonitionIcons } from './icons.js';

const ADMONITION_LABELS = {
  note: 'Note', tip: 'Tip', important: 'Important',
  warning: 'Warning', caution: 'Caution',
};

// All rendering is scoped to a buffer (the document data) and a root element
// (the #doc container it renders into), so multiple panes can coexist.

// ── Entry ────────────────────────────────────────────────────────────────────

export function renderDoc(buf, root) {
  buf.cbLineMap = buf.raw.split('\n')
    .map((line, i) => (/^\s*- \[[ xX]\]/.test(line) ? i : null))
    .filter(i => i !== null);

  root.innerHTML = marked.parse(buf.raw);

  renderAdmonitions(root);
  assignHeadingIds(root);
  addHeadingAnchors(buf, root);
  wireCheckboxes(buf, root);
  makeCollapsible(root);
  addCopyButtons(root);
  mapTablesToLines(buf, root);
  makeTablesEditable(buf, root);
  wireInternalLinks(buf, root);
  rewriteImages(buf, root);
}

async function save(buf) {
  await saveFile(buf.path, buf.raw);
  const el = $('saved');
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 1800);
}

// ── Headings: stable ids + deep-link anchors ────────────────────────────────

function assignHeadingIds(root) {
  const seen = {};
  root.querySelectorAll('h1, h2, h3').forEach(h => {
    const title = h.textContent.trim();
    h.dataset.title = title;
    let id = slugify(title) || 'section';
    if (seen[id] === undefined) seen[id] = 0;
    else { seen[id]++; id = `${id}-${seen[id]}`; }
    h.id = id;
  });
}

function addHeadingAnchors(buf, root) {
  root.querySelectorAll('h1, h2, h3').forEach(h => {
    const a = document.createElement('a');
    a.className = 'h-anchor';
    a.textContent = '#';
    a.href = '#' + h.id;
    a.title = 'Copy link to this section';
    a.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();                       // don't toggle the section collapse
      navigate(buf.path, h.id);                  // updates the URL hash
      navigator.clipboard?.writeText(location.href);
    });
    h.prepend(a);
  });
}

// ── Checkboxes ───────────────────────────────────────────────────────────────

function wireCheckboxes(buf, root) {
  root.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
    const li = cb.closest('li');
    if (li) {
      li.classList.add('task-item');
      const span = document.createElement('span');
      Array.from(li.childNodes).forEach(n => { if (n !== cb) span.appendChild(n.cloneNode(true)); });
      Array.from(li.childNodes).forEach(n => { if (n !== cb) li.removeChild(n); });
      li.appendChild(span);
      if (cb.checked) li.classList.add('done');
    }
    cb.disabled = false;
    cb.addEventListener('change', () => {
      if (li) li.classList.toggle('done', cb.checked);
      applyCheckbox(buf, i, cb.checked);
    });
  });
}

function applyCheckbox(buf, idx, checked) {
  const li = buf.cbLineMap[idx];
  if (li === undefined) return;
  const lines = buf.raw.split('\n');
  lines[li] = checked
    ? lines[li].replace(/- \[ \]/, '- [x]')
    : lines[li].replace(/- \[x\]/i, '- [ ]');
  buf.raw = lines.join('\n');
  save(buf);
}

// ── Collapsible sections ────────────────────────────────────────────────────

function makeCollapsible(root) {
  root.querySelectorAll('h2, h3').forEach(h => {
    const arrow = document.createElement('span');
    arrow.className = 'c-arrow';
    arrow.textContent = '▾';
    h.appendChild(arrow);

    h.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT' || e.target.classList.contains('h-anchor')) return;
      const collapsed = h.classList.toggle('collapsed');
      const level = parseInt(h.tagName[1], 10);
      let el = h.nextElementSibling;
      while (el) {
        const m = el.tagName.match(/^H(\d)$/);
        if (m && parseInt(m[1], 10) <= level) break;
        el.hidden = collapsed;
        el = el.nextElementSibling;
      }
    });
  });
}

// ── Copy buttons ─────────────────────────────────────────────────────────────

function addCopyButtons(root) {
  root.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const text = (pre.querySelector('code') ?? pre).textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
      });
    });
    pre.appendChild(btn);
  });
}

// ── Table editing ────────────────────────────────────────────────────────────

function mapTablesToLines(buf, root) {
  const lines = buf.raw.split('\n');
  const ranges = [];
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const isRow = /^\s*\|/.test(lines[i]);
    if (start === -1 && isRow) start = i;
    else if (start !== -1 && !isRow) { ranges.push([start, i - 1]); start = -1; }
  }
  if (start !== -1) ranges.push([start, lines.length - 1]);

  root.querySelectorAll('table').forEach((t, i) => { t._lines = ranges[i] ?? null; });
}

function makeTablesEditable(buf, root) {
  root.querySelectorAll('table td').forEach(td => {
    td.addEventListener('click', () => editCell(buf, td));
  });
}

function editCell(buf, td) {
  if (td.querySelector('input')) return;
  const original = td.textContent.trim();
  const input = document.createElement('input');
  input.className = 'cell-edit';
  input.value = original;
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim();
    td.textContent = val;
    if (val !== original) flushTable(buf, td.closest('table'));
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = original; td.textContent = original; }
  });
}

function flushTable(buf, table) {
  if (!table?._lines) return;
  const [start, end] = table._lines;
  const allLines = buf.raw.split('\n');
  const sep = allLines[start + 1];

  const newLines = [];
  Array.from(table.rows).forEach((row, i) => {
    const cells = Array.from(row.cells).map(c => c.textContent.trim());
    newLines.push('| ' + cells.join(' | ') + ' |');
    if (i === 0) newLines.push(sep);
  });

  allLines.splice(start, end - start + 1, ...newLines);
  buf.raw = allLines.join('\n');
  save(buf);
}

// ── Internal links ───────────────────────────────────────────────────────────

// Resolve an href relative to the current doc path into { path, heading }.
function resolveRelative(href, fromPath) {
  const hashIdx = href.indexOf('#');
  const rel = hashIdx === -1 ? href : href.slice(0, hashIdx);
  const heading = hashIdx === -1 ? null : href.slice(hashIdx + 1);
  if (!rel) return { path: fromPath, heading };   // same-doc fragment

  const base = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')).split('/') : [];
  for (const part of rel.split('/')) {
    if (part === '..') base.pop();
    else if (part === '.' || part === '') continue;
    else base.push(part);
  }
  return { path: base.join('/'), heading };
}

// GitHub-style alerts: a blockquote whose first paragraph opens with [!TYPE]
// becomes a styled callout with an icon + title.
function renderAdmonitions(root) {
  root.querySelectorAll('blockquote').forEach(bq => {
    const first = bq.querySelector('p');
    if (!first) return;
    const m = first.textContent.match(/^\s*\[!(\w+)\]/);
    if (!m) return;
    const type = m[1].toLowerCase();
    const label = ADMONITION_LABELS[type];
    if (!label) return;

    // Drop the "[!TYPE]" marker (and any trailing line break) from the body.
    first.innerHTML = first.innerHTML.replace(/^\s*\[!\w+\]\s*(<br\s*\/?>)?\s*/i, '');
    if (!first.textContent.trim() && !first.querySelector('img')) first.remove();

    bq.classList.add('admonition', `admonition-${type}`);
    const title = document.createElement('div');
    title.className = 'admonition-title';
    title.innerHTML = `${admonitionIcons[type]}<span>${label}</span>`;
    bq.prepend(title);
  });
}

// Relative <img> srcs point at files alongside the doc. Rewrite them to the
// server's /asset/ route, resolved relative to the current doc (like links).
// Absolute URLs (http:, data:, root-relative /) are left untouched.
function rewriteImages(buf, root) {
  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!src || /^[a-z]+:/i.test(src) || src.startsWith('/')) return;
    const { path } = resolveRelative(src, buf.path);
    img.src = '/asset/' + path.split('/').map(encodeURIComponent).join('/');
  });
}

function wireInternalLinks(buf, root) {
  root.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (a.classList.contains('h-anchor')) return;
    if (/^[a-z]+:\/\//i.test(href) || href.startsWith('mailto:')) {
      a.target = '_blank'; a.rel = 'noopener'; return;
    }
    if (href.startsWith('#')) {
      a.addEventListener('click', e => { e.preventDefault(); scrollToId(href.slice(1), root); });
      return;
    }
    if (!href) return;
    a.addEventListener('click', e => {
      e.preventDefault();
      const { path, heading } = resolveRelative(href, buf.path);
      navigate(path, heading);
    });
  });
}
