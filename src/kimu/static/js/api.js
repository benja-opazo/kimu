// Server API wrappers.

export const getFiles = () =>
  fetch('/api/files').then(r => r.json());

export const getFile = path =>
  fetch(`/api/file?path=${encodeURIComponent(path)}`).then(r => r.text());

export const saveFile = (path, body) =>
  fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: 'POST', body });

export const search = q =>
  fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());

export const getConfig = () =>
  fetch('/api/config').then(r => r.json());

// Tell the server to shut down. The connection drops as it exits, so we ignore
// any network error — that's the success signal, not a failure.
export const quit = () =>
  fetch('/api/quit', { method: 'POST' }).catch(() => {});
