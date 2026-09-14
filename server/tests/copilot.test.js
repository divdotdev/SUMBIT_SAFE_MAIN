import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { getConfig } from '../config/index.js';
import { Store } from '../services/store.js';
import { seed } from '../seed/data.js';
import { createProviders } from '../providers/index.js';
import { MockAIProvider, OpenAIProvider, GroqAIProvider, createAIProvider } from '../providers/ai/index.js';
import { createMatchContextCache, buildCopilotContext, minimizeQuestion } from '../services/copilotContext.js';
import { renderGroundedAnswer } from '../controllers/copilot.js';
import { analyzeText } from '../services/documentAnalysis.js';
import { educationDocumentLines, educationProfile } from './educationFixtures.js';

async function setup(t, ai, config = getConfig({ AI_PROVIDER: 'MOCK' })) {
  const store = new Store(config); await store.connect(); await seed(store); t.after(() => store.close());
  const providers = createProviders(config); if (ai) providers.ai = ai;
  const api = request(createApp({ store, config, providers }));
  const registration = (await api.post('/api/auth/register').send({ name: 'Riya Sharma', email: 'copilot@example.test', password: 'Password1!', profile: { dob: '2003-06-15' } }).expect(201)).body;
  const auth = { Authorization: `Bearer ${registration.token}` };
  const user = await store.one('User', { email: 'copilot@example.test' });
  const products = (await api.get('/api/loans?loanType=EDUCATION')).body.data;
  return { store, api, auth, user, products, providers };
}

test('Copilot: owned context, existing match reasons, ordered actions, corrected evidence and minimization', async t => {
  let captured; let question;
  const mock = new MockAIProvider();
  const fixture = await setup(t, { status: mock.status, async explain(context, message) { captured = context; question = message; return mock.explain(context, message); } });
  const { store, api, auth, user, products } = fixture;
  const selection = { productId: products[0]._id };
  const chat = async message => (await api.post('/api/copilot/chat').set(auth).send({ ...selection, message }).expect(200)).body;
  await api.post('/api/copilot/chat').send({ ...selection, message: 'Why not ready?' }).expect(401);
  await api.post('/api/copilot/chat').set(auth).send({ ...selection, message: 'hi', profile: { name: 'arbitrary' } }).expect(400);
  await api.post('/api/copilot/context').set(auth).send({ ...selection, loanType: 'HOME' }).expect(400);
  assert.equal((await api.post('/api/copilot/context').set(auth).send({}).expect(200)).body.status, 'no_context');
  let result = await chat('Why am I not ready?');
  assert.equal(result.status, 'success'); assert.match(result.answer, /NOT READY/); assert.match(result.answer, /MISSING/);
  assert.doesNotMatch(result.answer, /identity fields agree/);
  assert.match(result.answer, /before name and DOB consistency can be assessed/);
  assert.ok(result.references.some(r => r.type === 'requirement'));
  result = await chat('What should I fix next?'); assert.match(result.answer, /priority order/); assert.equal(result.nextActions[0].category, 'MISSING');
  await api.post('/api/loans/match').set(auth).send(educationProfile).expect(200);
  result = await chat('Why does this loan match me?'); assert.match(result.answer, /Income meets the demo minimum/); assert.match(result.answer, /100\/100/);
  result = (await api.post('/api/copilot/chat').set(auth).send({ ...selection, comparisonProductIds: [products[0]._id, products[2]._id], message: 'Compare these products' }).expect(200)).body;
  assert.equal(result.references.filter(r => r.type === 'product').length, 2); assert.match(result.answer, /DRIVING_LICENCE/);
  const application = (await api.post('/api/applications').set(auth).send({ loanProductId: products[0]._id, loanType: 'EDUCATION', loanAmount: 500000, tenure: 10 }).expect(201)).body.application;
  const foreign = await store.create('User', { name: 'Other Person', email: 'other-copilot@example.test', passwordHash: 'unused' });
  const foreignApplication = await store.create('LoanApplication', { userId: foreign._id, loanProductId: products[0]._id, loanType: 'EDUCATION', loanAmount: 10000, tenure: 1, applicationCode: 'SS-EDUCATION-2026-99999', dataMode: 'DEMO' });
  await api.post('/api/copilot/chat').set(auth).send({ applicationId: foreignApplication._id, message: 'Explain' }).expect(404);
  await api.post('/api/copilot/context').set(auth).send({ applicationId: application._id, productId: products[1]._id }).expect(400);
  async function evidence(type, lines) {
    const document = await store.create('Document', { userId: user._id, documentType: type, safeFileName: 'private.pdf', originalFileName: 'private-name.pdf', mimeType: 'application/pdf', size: 100, status: 'uploaded' });
    await store.create('DocumentAnalysis', { documentId: document._id, ...analyzeText({ text: lines.join('\n'), confidence: 95, documentType: type, user }) });
    return document;
  }
  for (const [type, lines] of Object.entries(educationDocumentLines)) if (type !== 'DRIVING_LICENCE') await evidence(type, lines);
  result = await chat('Explain readiness for Riya Sharma, copilot@example.test, ABCDE1234F and 1234 5678 9012');
  assert.match(result.answer, /READY FOR LENDER REVIEW/); assert.equal(result.summary.satisfied, 7);
  for (const secret of ['Riya Sharma', '2003-06-15', 'ABCDE1234F', '1234 5678 9012', '12 Demo', 'private-name.pdf', 'copilot@example.test']) {
    assert.ok(!JSON.stringify(captured).includes(secret), secret); assert.ok(!question.includes(secret), secret);
  }
  assert.ok(captured.evidence.every(e => e.sourceVerification !== 'SOURCE_VERIFIED'));
  result = await chat('Which evidence is unverified?'); assert.match(result.answer, /source not verified/); assert.equal(result.summary.unverified, 6);
  for (const message of ['Am I approved?', 'What is my approval probability?', 'Is this fake?', 'Is UIDAI verification complete?', 'Which co-applicant income requirement applies?']) {
    result = await chat(message); assert.match(result.answer, /unavailable/); assert.doesNotMatch(result.answer, /approved|guaranteed|probability|verified by/i);
  }
  await evidence('PAN', educationDocumentLines.PAN.map(line => line.replace('15/06/2003', '16/06/2003')));
  result = await chat('What information conflicts?'); assert.match(result.answer, /dob MISMATCH/); assert.equal(result.summary.state, 'REVIEW REQUIRED');
  await evidence('PAN', educationDocumentLines.PAN);
  result = await chat('Explain readiness'); assert.equal(result.summary.state, 'READY FOR LENDER REVIEW');
  await api.patch('/api/user/me').set(auth).send({ name: 'Riya S Sharma', profile: { dob: '2003-06-15' } }).expect(200);
  result = await chat('Why does this loan match me?'); assert.match(result.answer, /match reasons unavailable/);
});

test('Copilot rejects invented facts and prose, preserves deterministic priority, invalidates stale answers', async t => {
  const { store, user, products } = await setup(t);
  await store.update('User', user._id, { profile: {} });
  const cache = createMatchContextCache();
  const context = await buildCopilotContext(store, user._id, { productId: products[0]._id }, cache);
  assert.equal(context.actions[0].category, 'BLOCKER');
  assert.match(renderGroundedAnswer(context, { intent: 'next', factIds: [] }).answer, /Complete the applicant/);
  assert.throws(() => renderGroundedAnswer(context, { intent: 'readiness', factIds: ['made-up-coapplicant'] }));
  assert.throws(() => renderGroundedAnswer(context, { intent: 'readiness', factIds: ['readiness'], answer: 'Approved!' }));
  assert.throws(() => renderGroundedAnswer(context, { intent: 'match', factIds: ['requirement:income'] }));
  let change;
  const stale = await setup(t, { status: { mode: 'MOCK', available: true }, async explain() { await change(); return { intent: 'readiness', factIds: ['readiness'] }; } });
  change = () => stale.store.update('User', stale.user._id, { profile: {} });
  const response = (await stale.api.post('/api/copilot/chat').set(stale.auth).send({ loanType: 'EDUCATION', message: 'Explain readiness' }).expect(200)).body;
  assert.equal(response.status, 'context_changed'); assert.equal(response.references.length, 0);
});

test('Copilot gracefully handles disabled/missing key, provider failure and malformed output', async t => {
  for (const config of [getConfig({}), getConfig({ AI_PROVIDER: 'OPENAI', AI_MODEL: 'configured-model' })]) {
    const { api, auth } = await setup(t, null, config);
    const response = (await api.post('/api/copilot/chat').set(auth).send({ loanType: 'EDUCATION', message: 'Explain readiness' }).expect(200)).body;
    assert.equal(response.status, 'unavailable'); assert.ok(response.nextActions.length);
    await api.get('/api/health').expect(200); await api.get('/api/documents/readiness?loanType=EDUCATION').set(auth).expect(200);
  }
  for (const explain of [async () => { throw new Error('secret vendor error'); }, async () => ({ intent: 'readiness', factIds: ['invented'] })]) {
    const { api, auth } = await setup(t, { status: { mode: 'OPENAI', available: true }, explain });
    const response = (await api.post('/api/copilot/chat').set(auth).send({ loanType: 'EDUCATION', message: 'Explain readiness' }).expect(200)).body;
    assert.equal(response.status, 'provider_error'); assert.equal(response.references.length, 0); assert.doesNotMatch(JSON.stringify(response), /secret vendor error/);
  }
});

test('OpenAI transport uses structured plans, no storage, bounded call and strict validation', async () => {
  let sent;
  const transport = async (url, options) => { sent = { url, ...options }; return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"intent":"readiness","factIds":["readiness"]}' }] }] }) }; };
  const provider = new OpenAIProvider({ apiKey: 'test-only', model: 'configured-model' }, transport);
  assert.equal((await provider.explain({ facts: [{ id: 'readiness', text: 'NOT READY', topics: ['readiness'] }] }, 'Why?')).intent, 'readiness');
  const body = JSON.parse(sent.body); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.ok(sent.signal); assert.equal(body.tools, undefined);
  assert.equal((await provider.extractStructured()).status, 'unavailable');
  const incomplete = new OpenAIProvider({ apiKey: 'test', model: 'model' }, async () => ({ ok: true, json: async () => ({ status: 'incomplete' }) }));
  await assert.rejects(incomplete.explain({ facts: [{ id: 'readiness' }] }, 'why'));
});

test('matching snapshots expire, are user/type scoped, and exclude identifying input', () => {
  let time = 0; const cache = createMatchContextCache({ ttl: 10, max: 2, now: () => time });
  const user = { _id: 'one', updatedAt: 'v1' };
  cache.put(user, 'loan', educationProfile);
  assert.equal(cache.get(user, 'loan', 'EDUCATION').name, undefined);
  assert.equal(cache.get({ ...user, _id: 'two' }, 'loan', 'EDUCATION'), null);
  assert.equal(cache.get(user, 'loan', 'HOME'), null);
  assert.equal(cache.get({ ...user, updatedAt: 'v2' }, 'loan', 'EDUCATION'), null);
  cache.put(user, 'loan', educationProfile); time = 11; assert.equal(cache.get(user, 'loan', 'EDUCATION'), null);
  assert.doesNotMatch(minimizeQuestion('Riya (Sharma) DOB 15/06/2003', ['Riya (Sharma)']), /Riya|2003/);
});

test('Groq routes only its own credential to the Groq endpoint and validates structured responses', async () => {
  const config = getConfig({ AI_PROVIDER: 'GROQ', GROQ_API_KEY: 'groq-test-only', OPENAI_API_KEY: 'openai-test-only' });
  assert.equal(config.ai.apiKey, 'groq-test-only');
  assert.equal(config.ai.model, 'openai/gpt-oss-20b');
  assert.equal(createAIProvider(config.ai).status.mode, 'GROQ');
  assert.equal(createAIProvider(getConfig({ AI_PROVIDER: 'GROQ', OPENAI_API_KEY: 'wrong-provider-key' }).ai).status.available, false);
  let sent;
  const provider = new GroqAIProvider(config.ai, async (url, options) => {
    sent = { url, ...options };
    return { ok: true, json: async () => ({ status: 'completed', output: [
      { type: 'reasoning', content: [{ type: 'reasoning_text', text: 'Not returned to the application' }] },
      { type: 'message', content: [{ type: 'output_text', text: '{"intent":"next","factIds":["missing"]}' }] },
    ] }) };
  });
  assert.deepEqual(await provider.explain({ facts: [{ id: 'missing', text: 'Upload identity evidence.', topics: ['next'] }] }, 'What next?'), { intent: 'next', factIds: ['missing'] });
  assert.equal(sent.url, 'https://api.groq.com/openai/v1/responses');
  assert.equal(sent.headers.Authorization, 'Bearer groq-test-only');
  const body = JSON.parse(sent.body);
  assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.equal(body.reasoning.effort, 'low');
  assert.ok(!sent.body.includes('openai-test-only'));
  const bad = new GroqAIProvider(config.ai, async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"answer":"invented"}' }] }] }) }));
  await assert.rejects(bad.explain({ facts: [{ id: 'missing' }] }, 'What next?'));
});
