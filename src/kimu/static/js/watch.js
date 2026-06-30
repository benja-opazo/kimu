import { $ } from './dom.js';
import { state } from './store.js';
import { statFiles } from './api.js';
import { reloadBuffer } from './buffers.js';

// Autoreload: when the "Watch" toggle is on, poll the mtimes of every open doc
// and reload any whose file changed on disk. Pure client-side polling — no SSE,
// no extra deps. The toggle persists like the other docs-* settings.

const KEY = 'docs-watch';
const INTERVAL = 1000;

let timer = null;
let mtimes = new Map();        // path -> last seen mtime
const ignoreNext = new Set();  // paths whose next detected change is our own save

async function tick() {
  const paths = [...state.buffers.keys()];
  if (!paths.length) return;
  let stats;
  try { stats = await statFiles(paths); } catch { return; }
  for (const [path, m] of Object.entries(stats)) {
    if (m == null) continue;
    const prev = mtimes.get(path);
    mtimes.set(path, m);
    if (prev === undefined || m <= prev) continue;     // new tab, or unchanged
    if (ignoreNext.has(path)) { ignoreNext.delete(path); continue; }  // our own save
    reloadBuffer(path);
  }
}

function baseline() {
  const paths = [...state.buffers.keys()];
  if (!paths.length) return;
  statFiles(paths).then(s => {
    for (const [p, m] of Object.entries(s)) if (m != null) mtimes.set(p, m);
  }).catch(() => {});
}

function start() {
  if (timer) return;
  mtimes.clear();
  baseline();                  // record current mtimes so the first tick is quiet
  timer = setInterval(tick, INTERVAL);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

export function initWatch() {
  const cb = $('watch-check');
  if (!cb) return;
  const stored = localStorage.getItem(KEY);
  const on = stored === null ? true : stored === '1';   // default ON until the user chooses
  cb.checked = on;
  if (on) start();

  cb.addEventListener('change', () => {
    localStorage.setItem(KEY, cb.checked ? '1' : '0');
    cb.checked ? start() : stop();
  });

  // A save from inside Kimu bumps mtime; suppress the echo reload.
  document.addEventListener('kimu:localsave', e => {
    if (timer) ignoreNext.add(e.detail.path);
  });
}
