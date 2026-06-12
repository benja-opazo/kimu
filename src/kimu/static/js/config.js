import { $ } from './dom.js';
import { getConfig } from './api.js';

// Apply server-provided config to the shell and return it. Falls back silently
// to the static defaults baked into index.html if the request fails.
export async function initConfig() {
  let cfg;
  try { cfg = await getConfig(); }
  catch { return null; }

  if (cfg.name) {
    document.title = cfg.name;
    $('logo').textContent = cfg.name;   // the ::before mark is a pseudo-element, preserved
  }
  if (cfg.folder) $('logo').title = `Folder: ${cfg.folder}`;
  return cfg;
}
