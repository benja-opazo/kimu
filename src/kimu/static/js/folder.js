import { $ } from './dom.js';

// Ask the server to open the OS-native folder dialog; on success the server
// switches the served folder and we reload into the viewer.
async function pickFolder() {
  let data;
  try {
    const r = await fetch('/api/pick-folder', { method: 'POST' });
    data = await r.json();
  } catch {
    return showError('Could not reach the server.');
  }
  if (data.error) return showError(data.error);
  // Navigate to "/" (not reload): drops the URL hash so we don't reopen a doc
  // from the old folder — which would 404 if the new folder lacks that file.
  // A fresh load also clears all open tabs.
  if (data.folder) window.location.replace('/');
  // otherwise: the user cancelled — do nothing
}

function showError(msg) {
  const landing = $('landing');
  if (landing && !landing.hidden) {
    const el = $('landing-err');
    el.textContent = msg;
    el.hidden = false;
  } else {
    alert(msg);
  }
}

// Empty state shown when no folder is open yet.
export function showLanding() {
  $('app').hidden = true;
  $('landing').hidden = false;
  $('landing-open').addEventListener('click', pickFolder);
}

// The toolbar "change folder" button (present once a folder is open).
export function wireFolderButton() {
  $('folder-btn').addEventListener('click', pickFolder);
}
