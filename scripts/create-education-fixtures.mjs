import fs from 'node:fs/promises';
import { pdf } from '../server/tests/helpers.js';
import { educationDocumentLines } from '../server/tests/educationFixtures.js';
const directory = new URL('../client/public/demo-education/', import.meta.url);
await fs.mkdir(directory, { recursive: true });
for (const [type, lines] of Object.entries(educationDocumentLines)) await fs.writeFile(new URL(`${type}.pdf`, directory), pdf(lines));
await fs.writeFile(new URL('DRIVING_LICENCE_VARIATION.pdf', directory), pdf(educationDocumentLines.DRIVING_LICENCE.map(s => s.replace('Riya Sharma', 'Riya S Sharma'))));
console.info('Created eight clearly labeled synthetic Education Loan fixtures. Aadhaar is masked.');
