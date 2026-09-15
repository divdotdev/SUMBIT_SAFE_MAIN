import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../config/index.js';
import { calculateEmi } from '../utils/emi.js';
import { matchLoan } from '../services/matching.js';
import { analyzeText, redactIdentifiers } from '../services/documentAnalysis.js';
import { createProviders } from '../providers/index.js';
import { lenders } from '../seed/data.js';
import { documentLines, sampleProfile } from './helpers.js';

test('reducing balance EMI, zero interest and invalid values', () => {
  assert.equal(calculateEmi(100000, 12, 1), 8884.88);
  assert.equal(calculateEmi(120000, 0, 1), 10000);
  assert.throws(() => calculateEmi(0, 12, 1)); assert.throws(() => calculateEmi(1, 1, NaN));
});
test('loan matching uses all six weights and never implies approval', () => {
  const result = matchLoan(lenders[0], sampleProfile);
  assert.equal(result.matchScore, 100); assert.equal(result.reasons.length, 6); assert.equal(result.potentialMatch, true);
  assert.equal('approved' in result, false);
  const weak = matchLoan(lenders[0], { ...sampleProfile, monthlyIncome: 0, age: 90, loanAmount: 1e9, creditScoreRange: 'unknown', employmentType: 'unemployed' });
  assert.equal(weak.matchScore, 0);
});
test('readiness masks identifiers, compares profile, and never exposes OCR text', () => {
  const user = { name: 'Test Person', profile: { dob: '1995-01-01' } };
  for (const [documentType, lines] of Object.entries(documentLines)) {
    const result = analyzeText({ text: lines.join('\n'), documentType, user, confidence: 95 });
    assert.equal(result.status, 'passed', documentType); assert.equal(result.readinessScore, 100);
    assert.equal(result.verificationMode, 'SANDBOX_DOCUMENT_CHECK');
    assert.ok(!JSON.stringify(result).includes('1234 5678 9012')); assert.ok(!JSON.stringify(result).includes('ABCDE1234F'));
  }
  const mismatch = analyzeText({ text: documentLines.AADHAAR.join('\n'), documentType: 'AADHAAR', confidence: 95, user: { name: 'Someone Else', profile: { dob: '2000-01-01' } } });
  assert.equal(mismatch.status, 'failed'); assert.equal(mismatch.nameMatch, false); assert.equal(mismatch.dobMatch, false);
  assert.equal(analyzeText({ documentType: 'AADHAAR', user }).status, 'manual_review');
  assert.equal(redactIdentifiers('123456789012 ABCDE1234F'), 'XXXX XXXX 9012 ABCDE****F');
});
test('dummy Mongo URI is never contacted and LIVE requires a safe configuration', () => {
  const dummy = { MONGODB_URI: 'mongodb+srv://submitsafe_demo:DummyPassword123@cluster0.mongodb.net/submitsafe' };
  assert.equal(getConfig(dummy).databaseMode, 'MEMORY');
  assert.throws(() => getConfig({ ...dummy, MOCK_DATABASE: 'MONGODB' }));
  assert.throws(() => getConfig({ APP_MODE: 'LIVE' }));
  assert.throws(() => getConfig({ APP_MODE: 'OTHER' }));
});
test('all LIVE adapters fail explicitly even if environment has placeholder credentials', async () => {
  const providers = createProviders({ appMode: 'LIVE' });
  for (const [category, methods] of Object.entries({ document: ['analyzeIdentityDocument'], identity: ['verifyIdentity', 'verifyPan'], financial: ['analyzeBankStatement', 'analyzeIncome', 'extractFinancialSummary'], credit: ['getCreditReport'], lender: ['submitApplication'] })) {
    for (const method of methods) await assert.rejects(() => providers[category][method]({}), { name: 'ProviderNotConfiguredError', status: 503 });
  }
});
