import { getConfig } from '../config/index.js';
import { Store } from '../services/store.js';
import { seed } from './data.js';
let store;
try {
  store = new Store(getConfig()); await store.connect();
  const result = await seed(store); console.info(JSON.stringify(result));
  if (store.config.databaseMode === 'MEMORY') console.info('MEMORY mode is ephemeral. npm run dev automatically seeds its own in-memory database.');
} catch { console.error('Seed failed. Use APP_MODE=MOCK and a valid local/real MongoDB URI when enabling MongoDB.'); process.exitCode = 1; }
finally { if (store) await store.close(); }
