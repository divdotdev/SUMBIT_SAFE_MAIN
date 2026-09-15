import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errors.js';
import { AppError } from './utils/errors.js';
import { createProviders } from './providers/index.js';
export function createApp({ config, store, providers = createProviders(config) }) {
  const app = express(); app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin(origin, cb) { const allowed = !origin || config.frontendUrl === '*' || origin === config.frontendUrl; cb(allowed ? null : new AppError(403, 'Origin is not allowed'), allowed); }, credentials: false }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', createRoutes(store, config, providers));
  // uploads are intentionally never mounted as a public static directory.
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }));
  app.use(errorHandler);
  return app;
}
