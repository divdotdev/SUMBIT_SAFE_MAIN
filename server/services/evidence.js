// Local extraction only. No authority/provider response is inferred from document text.
export const sourceStatuses = ['SOURCE_VERIFIED', 'SOURCE_NOT_VERIFIED', 'VERIFICATION_FAILED', 'NOT_AVAILABLE'];
export const identityTypes = ['AADHAAR', 'PAN', 'DRIVING_LICENCE'];
const normalized = value => (value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export function normalizeDate(value = '') {
  if (typeof value !== 'string') return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  const match = iso || (local ? [local[0], local[3], local[2], local[1]] : null);
  if (!match) return null;
  const key = `${match[1]}-${match[2]}-${match[3]}`; const date = new Date(key);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === key ? key : null;
}
const labels = 'name|employee|account holder|customer name|dob|date of birth|address|gender|male|female|pan|dl no|licence no|license no|issue date|valid until|validity|class|employer|month|statement period|course|institution|fees|total fee';
function field(text, label) {
  return text.match(new RegExp(`(?:^|[\\n ]+)(?:${label})\\s*:\\s*(.+?)(?=\\n|\\s+(?:${labels})\\s*[:]|$)`, 'im'))?.[1]?.trim().slice(0, 180) || null;
}
function cleanField(value) {
  return value?.replace(/\b\d{4}[ -]?\d{4}[ -]?(\d{4})\b/g, 'XXXX XXXX $1').replace(/\b([a-z]{5})\s*\d{4}\s*([a-z])\b/gi, '$1****$2') || null;
}
export function extractEvidence({ text, documentType, confidence, extractionMethod = 'LOCAL_OCR' }) {
  const name = cleanField(field(text, 'name|employee|account holder|customer name'));
  const dobText = text.match(/(?:DOB|date of birth)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i)?.[1];
  const pan = text.match(/\b([A-Z]\s*[A-Z]\s*[A-Z]\s*[A-Z]\s*[A-Z]\s*\d\s*\d\s*\d\s*\d\s*[A-Z])\b/i)?.[1]?.replace(/\s/g, '').toUpperCase();
  const aadhaar = text.match(/\b(?:\d{4}[ -]?\d{4}|XXXX[ -]?XXXX)[ -]?(\d{4})\b/i);
  const dl = field(text, 'dl no|licence no|license no')?.replace(/[ -]/g, '').toUpperCase();
  const dlValid = !!dl && /^[A-Z]{2}\d{13}$/.test(dl);
  const recognized = documentType === 'AADHAAR' ? /aadhaar|unique identification|government of india/i.test(text) && !!aadhaar
    : documentType === 'PAN' ? /income tax|permanent account|\bpan\b/i.test(text) && !!pan
    : documentType === 'DRIVING_LICENCE' ? /driving licen[cs]e/i.test(text)
    : documentType === 'ADMISSION_LETTER' ? /admission (letter|offer)|offer of admission/i.test(text)
    : documentType === 'FEE_SCHEDULE' ? /fee schedule|fee structure/i.test(text) : null;
  const identity = identityTypes.includes(documentType);
  return { schemaVersion: '1.0', documentType,
    recognition: { status: recognized === null ? 'NOT_AVAILABLE' : recognized ? 'RECOGNIZED' : 'UNCERTAIN' },
    extraction: { status: !text.trim() ? 'UNAVAILABLE' : confidence >= 45 ? 'EXTRACTED' : 'LOW_CONFIDENCE', method: extractionMethod },
    fields: { name, dob: normalizeDate(dobText), address: cleanField(field(text, 'address')),
      maskedIdentifier: documentType === 'AADHAAR' && aadhaar ? `XXXX XXXX ${aadhaar[1]}` : documentType === 'PAN' && pan ? `${pan.slice(0, 5)}****${pan.slice(-1)}` : documentType === 'DRIVING_LICENCE' && dlValid ? `${dl.slice(0, 2)}*********${dl.slice(-4)}` : null,
      identifierFormatValid: documentType === 'AADHAAR' ? !!aadhaar : documentType === 'PAN' ? !!pan && /^[A-Z]{5}\d{4}[A-Z]$/.test(pan) : documentType === 'DRIVING_LICENCE' ? dlValid : null,
      issueDate: documentType === 'DRIVING_LICENCE' ? normalizeDate(field(text, 'issue date')) : null,
      validUntil: documentType === 'DRIVING_LICENCE' ? normalizeDate(field(text, 'valid until|validity')) : null,
      vehicleClass: documentType === 'DRIVING_LICENCE' ? cleanField(field(text, 'class')) : null,
      institution: cleanField(field(text, 'institution')), course: cleanField(field(text, 'course')),
      totalFee: documentType === 'FEE_SCHEDULE' ? Number(text.match(/(?:fees|total fee)\s*:\s*(?:INR|Rs\.?|₹)?\s*([\d,]+)/i)?.[1]?.replaceAll(',', '')) || null : null },
    sourceVerification: { status: identity ? 'SOURCE_NOT_VERIFIED' : 'NOT_AVAILABLE', provider: null,
      explanation: identity ? 'Local extraction only. No authorized UIDAI, PAN, DigiLocker or Parivahan provider is configured. QR detection is not source verification.' : 'No institution, employer or bank source verification is configured.' },
    provenance: { method: extractionMethod, origin: 'USER_UPLOAD' } };
}
export function compareField(left, right, fieldName) {
  if (!left || !right) return 'UNCERTAIN';
  const a = normalized(left); const b = normalized(right);
  if (!a || !b) return 'UNCERTAIN';
  if (a === b) return 'MATCH';
  if (fieldName === 'name') {
    const x = a.split(' '); const y = b.split(' ');
    if (x.length >= 2 && y.length >= 2 && x[0] === y[0] && x.at(-1) === y.at(-1)) return 'POSSIBLE_MATCH';
    if (x.length === y.length && x.every((v, i) => v === y[i] || (Math.min(v.length, y[i].length) === 1 && v[0] === y[i][0]))) return 'POSSIBLE_MATCH';
  }
  // Address variation cannot establish a contradiction without structured address data.
  return fieldName === 'address' ? 'UNCERTAIN' : 'MISMATCH';
}
export function consistencyChecks(documents, user) {
  const identities = documents.filter(d => identityTypes.includes(d.documentType) && d.analysis?.evidence);
  const checks = [];
  const compare = (left, right, leftFields, rightFields, fields) => {
    for (const field of fields) {
      const status = compareField(leftFields[field], rightFields[field], field);
      checks.push({ left, right, field, status, explanation: status === 'MATCH' ? 'Normalized values agree.' : status === 'POSSIBLE_MATCH' ? 'Possible name variation; human review is required.' : status === 'MISMATCH' ? 'Extracted values differ; correct the evidence or profile and request review.' : 'Missing or insufficiently comparable values; no conclusion can be drawn.' });
    }
  };
  for (let i = 0; i < identities.length; i++) {
    const a = identities[i];
    compare(a.documentId, 'APPLICANT_PROFILE', a.analysis.evidence.fields, { name: user.name, dob: user.profile?.dob }, ['name', 'dob']);
    for (const b of identities.slice(i + 1)) compare(a.documentId, b.documentId, a.analysis.evidence.fields, b.analysis.evidence.fields,
      ['name', 'dob', ...(a.documentType !== 'PAN' && b.documentType !== 'PAN' ? ['address'] : [])]);
  }
  return checks;
}
