import fs from 'node:fs/promises';
import { pdf } from '../server/tests/helpers.js';
import { homeDocumentLines } from '../server/tests/homeFixtures.js';
const directory = new URL('../client/public/demo-home/', import.meta.url);
await fs.mkdir(directory, { recursive: true });
for (const [type, lines] of Object.entries(homeDocumentLines)) await fs.writeFile(new URL(`${type}.pdf`, directory), pdf(lines));
console.info('Created four synthetic Rahul Home Loan PDFs with synthetic identities (Aadhaar masked; PAN masked in results).');
