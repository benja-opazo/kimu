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
