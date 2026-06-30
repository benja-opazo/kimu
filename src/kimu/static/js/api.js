// Server API wrappers.

export const getFiles = () =>
  fetch('/api/files').then(r => r.json());

// no-store so a reload always fetches fresh content, never the HTTP cache.
export const getFile = path =>
  fetch(`/api/file?path=${encodeURIComponent(path)}`, { cache: 'no-store' }).then(r => r.text());

export const saveFile = (path, body) =>
  fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'POST', body });

// Modification times for one or more docs: { path: mtime|null }. Used by the
// watch/autoreload poller to detect external changes.
export const statFiles = paths =>
  fetch('/api/stat?' + paths.map(p => 'path=' + encodeURIComponent(p)).join('&'),
        { cache: 'no-store' })            // poll must see live mtimes, not the cache
    .then(r => r.json());

export const search = q =>
  fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());

export const getConfig = () =>
  fetch('/api/config').then(r => r.json());

// Tell the server to shut down. The connection drops as it exits, so we ignore
// any network error — that's the success signal, not a failure.
export const quit = () =>
  fetch('/api/quit', { method: 'POST' }).catch(() => {});
