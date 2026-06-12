import { initTheme } from './theme.js';
import { initReader } from './reader.js';
import { initSidebar } from './sidebar.js';
import { initSearch } from './search.js';
import { initRouter } from './router.js';
import { initBuffers } from './buffers.js';
import { initConfig } from './config.js';
import { showLanding, wireFolderButton } from './folder.js';
import { initQuit } from './quit.js';

(async function boot() {
  initTheme();
  initQuit();                    // quit works on both the landing and reader views
  const cfg = await initConfig();

  if (!cfg || !cfg.folder) {     // no folder open yet -> landing screen
    showLanding();
    return;
  }

  initReader();
  wireFolderButton();
  const paths = await initSidebar();
  initSearch();
  initBuffers();                 // pane + tab strip, before any navigation
  const def = paths.includes('README.md') ? 'README.md' : paths[0];
  initRouter(def);
})();
