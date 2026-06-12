import { $ } from './dom.js';
import { quit } from './api.js';

// Wire the toolbar and landing "Quit" buttons. Asks the server to stop, then
// shows the "stopped" screen. When Kimu was launched from the app icon (in a
// terminal), the hosting terminal window closes on its own once the process
// exits — so this is the clean stop for icon launches as well as `kimu` in a
// shell.
export function initQuit() {
  for (const id of ['quit-btn', 'landing-quit']) {
    const btn = $(id);
    if (btn) btn.addEventListener('click', doQuit);
  }
}

async function doQuit() {
  if (!confirm('Stop the Kimu server? Any open tabs will stop working.')) return;
  await quit();
  $('app').hidden = true;
  if ($('landing')) $('landing').hidden = true;
  $('stopped').hidden = false;
  window.close();   // only works if this tab was opened by a script; harmless otherwise
}
