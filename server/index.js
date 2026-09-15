import { getConfig } from './config/index.js';
import { Store } from './services/store.js';
import { createApp } from './app.js';
import { seed } from './seed/data.js';
try {
  const config = getConfig(); const store = new Store(config); await store.connect();
  if (config.appMode === 'MOCK') await seed(store);
  const app = createApp({ config, store });
  const server = app.listen(config.port, () => console.info(`SubmitSafe listening on port ${config.port} (${config.appMode}, ${store.getStatus()})`));
  server.requestTimeout = 60000;
  server.on('error', () => { console.error('HTTP server could not start. Check PORT availability.'); process.exit(1); });
  const shutdown = () => { const timeout = setTimeout(() => process.exit(1), 10000); timeout.unref(); server.close(async () => { await store.close(); process.exit(0); }); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
} catch (err) { console.error('Backend startup failed:', err); process.exitCode = 1; }
