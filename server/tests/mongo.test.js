import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getConfig } from '../config/index.js';
import { Store } from '../services/store.js';

test('MongoDB persists across connections, validates records, and enforces uniqueness', { skip: !process.env.TEST_MONGODB_URI }, async t => {
  const config = getConfig({ APP_MODE: 'MOCK', MOCK_DATABASE: 'MONGODB', MONGODB_URI: process.env.TEST_MONGODB_URI });
  const store = new Store(config); await store.connect();
  let user;
  t.after(async () => { if (user) await store.remove('User', user._id); await store.close(); });
  const email = `persistence-${randomUUID()}@example.test`;
  user = await store.create('User', { name: 'Persistence Test', email, passwordHash: 'synthetic-test-hash' });
  await assert.rejects(() => store.create('User', { name: 'Duplicate', email, passwordHash: 'synthetic-test-hash' }), { code: 11000 });
  await store.close(); await store.connect();
  assert.equal((await store.one('User', { _id: user._id })).email, email);
  await store.update('User', user._id, { name: 'Updated Test' });
  assert.equal((await store.one('User', { _id: user._id })).name, 'Updated Test');
  await assert.rejects(() => store.update('User', user._id, { role: 'superuser' }));
  assert.equal(store.getStatus(), 'connected');
});
