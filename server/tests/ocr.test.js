import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { LocalOCRProvider } from '../providers/document/LocalOCRProvider.js';
import { getConfig } from '../config/index.js';

test('Tesseract reads a local synthetic PAN image using bundled language data', { timeout: 45000 }, async t => {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'submitsafe-ocr-'));
  t.after(() => fs.rm(uploadDir, { recursive: true, force: true }));
  const canvas = createCanvas(1400, 700); const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1400, 700); ctx.fillStyle = 'black'; ctx.font = '44px sans-serif';
  ['INCOME TAX DEPARTMENT', 'Permanent Account Number', 'Name: TEST PERSON', 'DOB: 01/01/1995', 'ABCDE1234F'].forEach((line, i) => ctx.fillText(line, 80, 100 + i * 100));
  await fs.writeFile(path.join(uploadDir, 'synthetic.png'), canvas.toBuffer('image/png'));
  const provider = new LocalOCRProvider({ ...getConfig({}), uploadDir });
  const result = await provider.analyzeIdentityDocument({ document: { safeFileName: 'synthetic.png', mimeType: 'image/png', documentType: 'PAN' }, user: { name: 'Test Person', profile: { dob: '1995-01-01' } } });
  assert.equal(result.identifierDetected, true, JSON.stringify(result)); assert.equal(result.nameMatch, true);
  assert.equal(result.maskedIdentifier, 'ABCDE****F'); assert.equal(result.status, 'passed');
  assert.ok(!JSON.stringify(result).includes('ABCDE1234F'));
});
