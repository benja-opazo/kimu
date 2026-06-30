// Mermaid diagram support. The library is ~3 MB, so it is lazy-loaded the first
// time a document actually contains a ```mermaid block — documents without
// diagrams never download it. Diagrams re-render on theme change.

let loadingPromise = null;
let seq = 0;

function currentTheme() {
  return document.documentElement.dataset.theme || 'light';
}

// Map Kimu's 7 themes onto mermaid's built-in light/dark themes.
function mermaidThemeFor(id) {
  const dark = new Set(['dark', 'ayu-dark', 'dracula', 'synthwave']);
  return dark.has(id) ? 'dark' : 'default';
}

function ensureMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/static/vendor/mermaid.min.js';
    s.onload = () => {
      window.mermaid.initialize({ startOnLoad: false, theme: mermaidThemeFor(currentTheme()) });
      resolve(window.mermaid);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loadingPromise;
}

function draw(mermaid, host, src) {
  mermaid.render('mmd-' + (seq++), src)
    .then(({ svg }) => { host.innerHTML = svg; })
    .catch(err => { host.innerHTML = `<pre class="mermaid-error">${String(err)}</pre>`; });
}

// Render pass: replace each ```mermaid code block with a diagram container,
// keeping the source in data-src so it can be re-rendered on theme change.
export function renderMermaid(root) {
  const blocks = root.querySelectorAll('pre > code.language-mermaid');
  if (!blocks.length) return;
  ensureMermaid().then(mermaid => {
    blocks.forEach(code => {
      const pre = code.closest('pre');
      const host = document.createElement('div');
      host.className = 'mermaid-diagram';
      host.dataset.src = code.textContent;
      pre.replaceWith(host);
      draw(mermaid, host, host.dataset.src);
    });
  }).catch(() => {/* load failed; leave the code block as plain text */});
}

// Re-render every on-screen diagram when the theme changes.
export function initMermaidTheming() {
  document.addEventListener('kimu:themechange', e => {
    if (!window.mermaid) return;                 // nothing rendered yet
    window.mermaid.initialize({ startOnLoad: false, theme: mermaidThemeFor(e.detail.theme) });
    document.querySelectorAll('.mermaid-diagram').forEach(host => {
      if (host.dataset.src) draw(window.mermaid, host, host.dataset.src);
    });
  });
}
