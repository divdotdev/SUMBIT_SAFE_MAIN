import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getConfig(env = process.env) {
  const appMode = env.APP_MODE || 'MOCK';
  if (!['MOCK', 'LIVE'].includes(appMode)) throw new Error('APP_MODE must be MOCK or LIVE');
  const databaseMode = appMode === 'MOCK' ? (env.MOCK_DATABASE || 'MEMORY') : 'MONGODB';
  if (!['MEMORY', 'MONGODB'].includes(databaseMode)) throw new Error('Invalid database mode');
  const jwtSecret = env.JWT_SECRET || (appMode === 'MOCK' ? 'dummy-jwt-secret-change-this-before-production-2026' : '');
  if (appMode === 'LIVE' && (jwtSecret.length < 32 || /dummy|change-this/i.test(jwtSecret))) {
    throw new Error('LIVE mode requires a strong JWT_SECRET of at least 32 characters');
  }
  if (databaseMode === 'MONGODB' && (!env.MONGODB_URI || /dummy|submitsafe_demo|cluster0\.mongodb\.net/i.test(env.MONGODB_URI))) {
    throw new Error('Set a real/local MONGODB_URI before enabling MongoDB; placeholder credentials are never contacted');
  }
  if (env.FILE_STORAGE_MODE && env.FILE_STORAGE_MODE !== 'LOCAL') throw new Error('Only LOCAL file storage is implemented');
  const maxUploadMb = Number(env.MAX_UPLOAD_MB || 10);
  if (!Number.isFinite(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 25) throw new Error('MAX_UPLOAD_MB must be between 1 and 25');
  const aiProvider = env.AI_PROVIDER || 'DISABLED';
  if (!['DISABLED', 'MOCK', 'OPENAI', 'GROQ'].includes(aiProvider)) throw new Error('AI_PROVIDER must be DISABLED, MOCK, OPENAI or GROQ');
  return {
    appMode, databaseMode, jwtSecret, mongoUri: env.MONGODB_URI,
    port: Number(env.PORT || 5000), frontendUrl: env.FRONTEND_URL || 'http://localhost:5173',
    uploadDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads'),
    maxUploadBytes: maxUploadMb * 1024 * 1024, localOcrEnabled: env.LOCAL_OCR_ENABLED !== 'false',
    ai: { provider: aiProvider, apiKey: aiProvider === 'GROQ' ? env.GROQ_API_KEY : env.OPENAI_API_KEY, model: env.AI_MODEL || (aiProvider === 'GROQ' ? 'openai/gpt-oss-20b' : undefined) },
  };
}
