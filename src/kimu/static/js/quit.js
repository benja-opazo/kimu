import { $ } from './dom.js';
import { quit } from './api.js';

// The toolbar/landing "Quit" buttons open a confirm modal; confirming asks the
// server to stop and shows the "stopped" screen. When Kimu was launched from
// the app icon (in a terminal), the hosting terminal window closes on its own
// once the process exits — so this is the clean stop for icon launches too.
export function initQuit() {
  for (const id of ['quit-btn', 'landing-quit']) $(id)?.addEventListener('click', open);

  $('quit-cancel').addEventListener('click', close);
  $('quit-confirm').addEventListener('click', doQuit);
  // Click the dimmed backdrop (but not the dialog) to dismiss.
  $('confirm-quit').addEventListener('click', e => { if (e.target === $('confirm-quit')) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('confirm-quit').hidden) close();
  });
}

function open() { $('confirm-quit').hidden = false; $('quit-confirm').focus(); }
function close() { $('confirm-quit').hidden = true; }

async function doQuit() {
  close();
  await quit();
  $('app').hidden = true;
  if ($('landing')) $('landing').hidden = true;
  $('stopped').hidden = false;
  window.close();   // only works if this tab was opened by a script; harmless otherwise
}
