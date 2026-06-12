// Shared state + a tiny navigation event bus.
// Components request navigation via navigate(); the buffer manager is the only
// listener, which keeps modules decoupled.
//
// A "buffer" is one open document: { path, raw, cbLineMap, scrollTop }.

export const state = {
  buffers: new Map(),   // path -> buffer (insertion order = tab order)
  activePath: null,
};

const bus = new EventTarget();

export function navigate(path, heading = null) {
  bus.dispatchEvent(new CustomEvent('navigate', { detail: { path, heading } }));
}

export function onNavigate(fn) {
  bus.addEventListener('navigate', e => fn(e.detail));
}

export function getBuffer(path) {
  return state.buffers.get(path) || null;
}

export function activeBuffer() {
  return state.activePath ? state.buffers.get(state.activePath) || null : null;
}
