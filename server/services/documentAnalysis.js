import { extractEvidence, identityTypes, compareField, normalizeDate } from './evidence.js';
import { educationReadiness } from './requirements.js';
export const readinessDisclaimer = 'This result assesses document readiness and does not constitute UIDAI authentication, PAN verification, Parivahan verification or lender approval.';
export function redactIdentifiers(value = '') {
  return value.replace(/\b\d{4}[ -]?\d{4}[ -]?(\d{4})\b/g, 'XXXX XXXX $1').replace(/\b([A-Z]{5})\d{4}([A-Z])\b/gi, '$1****$2');
}
const normalize = value => value.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
function amount(text, label) {
  const match = text.match(new RegExp(`${label}\\s*(?:salary|pay)?\\s*[:=]?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, 'i'));
  return match ? Number(match[1].replaceAll(',', '')) : null;
}
export function analyzeText({ text = '', confidence = 0, documentType, user, warnings: sourceWarnings = [], extractionMethod = 'LOCAL_OCR' }) {
  const evidence = extractEvidence({ text, documentType, confidence, extractionMethod });
  evidence.consistency = { name: compareField(evidence.fields.name, user.name, 'name'), dob: compareField(evidence.fields.dob, user.profile?.dob, 'dob') };
  const warnings = [...sourceWarnings]; const recommendations = [];
  const clean = normalize(text); const tokens = normalize(user.name).split(' ').filter(Boolean);
  const nameMatch = clean.length ? tokens.length > 0 && tokens.every(token => (` ${clean} `).includes(` ${token} `)) : null;
  const nameDetected = nameMatch === true || /\b(name|employee|account holder)\s*[:\-]/i.test(text);
  const dob = text.match(/(?:DOB|date of birth)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i)?.[1];
  const birthYear = text.match(/(?:year of birth|YOB)\s*[:\-]?\s*(\d{4})/i)?.[1];
  const profileDob = user.profile?.dob;
  const dobMatch = profileDob && (dob || birthYear) ? (dob ? normalizeDate(dob) === normalizeDate(profileDob) : profileDob.slice(0, 4) === birthYear) : null;
  const salary = /salary|payslip|pay slip/i.test(text);
  const bank = /bank|statement of account|account statement/i.test(text);
  const documentDetected = evidence.recognition.status !== 'NOT_AVAILABLE' ? evidence.recognition.status === 'RECOGNIZED' : documentType === 'SALARY_SLIP' ? salary : bank;
  evidence.recognition.status = documentDetected ? 'RECOGNIZED' : 'UNCERTAIN';
  const identifierDetected = identityTypes.includes(documentType) ? evidence.fields.identifierFormatValid : false;
  const maskedIdentifier = evidence.fields.maskedIdentifier;
  const readable = text.trim().length >= 40 && confidence >= 45;
  const extractedFields = {};
  if (documentType === 'SALARY_SLIP') Object.assign(extractedFields, {
    employeeDetected: /employee\s*[:\-]/i.test(text), employerDetected: /employer|company/i.test(text),
    monthDetected: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\b\d{2}[/-]\d{4}\b/i.test(text),
    grossSalary: amount(text, 'gross'), netSalary: amount(text, 'net'),
  });
  if (documentType === 'BANK_STATEMENT') {
    const dates = [...text.matchAll(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g)].map(m => Date.UTC(+m[3], +m[2] - 1, +m[1])).filter(Number.isFinite);
    Object.assign(extractedFields, { bankNameDetected: /\b[a-z]+(?:\s+[a-z]+){0,3}\s+bank\b/i.test(text),
      accountHolderDetected: /account holder|customer name|name\s*:/i.test(text),
      statementPeriodDetected: /(?:statement period|period|from)\s*[:\-]?/i.test(text) && dates.length >= 2,
      monthsCovered: dates.length >= 2 ? Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / (30.44 * 86400000))) : 0 });
  }
  const identity = identityTypes.includes(documentType);
  const coverage = documentType === 'ADMISSION_LETTER' ? !!(evidence.fields.institution && evidence.fields.course) : documentType === 'FEE_SCHEDULE' ? !!(evidence.fields.institution && evidence.fields.totalFee) : identity ? !!(dob || birthYear) : documentType === 'SALARY_SLIP' ? extractedFields.monthDetected && extractedFields.grossSalary != null && extractedFields.netSalary != null && extractedFields.employerDetected : extractedFields.statementPeriodDetected && extractedFields.monthsCovered >= 3;
  const format = identity ? identifierDetected : documentDetected;
  const readinessScore = (documentDetected ? 20 : 0) + (readable ? 25 : 0) + (nameMatch ? 25 : 0) + (format ? 15 : 0) + (coverage && dobMatch !== false ? 15 : 0);
  if (!documentDetected) { warnings.push('Expected document type could not be confirmed'); recommendations.push('Upload the correct document with all edges visible'); }
  if (!readable) { warnings.push('Document text is unavailable or has low readability'); recommendations.push('Upload a clearer image or a searchable PDF'); }
  if (nameMatch !== true) { warnings.push('Name could not be matched to the profile'); recommendations.push('Check the profile name and upload a document with the same name'); }
  if (dobMatch === false) { warnings.push('Date of birth differs from the profile'); recommendations.push('Correct the profile or provide a matching document'); }
  if (identity && dobMatch === null) recommendations.push('Add a profile DOB and provide a legible date of birth for comparison');
  if (!coverage) recommendations.push(documentType === 'ADMISSION_LETTER' ? 'Ensure institution and course are visible' : documentType === 'FEE_SCHEDULE' ? 'Ensure institution and total fee are visible' : identity ? 'Ensure the date or year of birth is visible' : documentType === 'BANK_STATEMENT' ? 'Provide a statement covering at least three months with a clear period' : 'Ensure employer, salary month, gross pay and net pay are visible');
  const expiredLicence = documentType === 'DRIVING_LICENCE' && evidence.fields.validUntil && evidence.fields.validUntil < new Date().toISOString().slice(0, 10);
  if (expiredLicence) { warnings.push('The extracted Driving Licence validity date is in the past'); recommendations.push('Provide current licence evidence or request lender review'); }
  const status = !text.trim() ? 'manual_review' : !documentDetected || dobMatch === false ? 'failed' : !expiredLicence && readinessScore >= 85 && coverage && (!identity || (dobMatch === true && identifierDetected)) ? 'passed' : 'warning';
  // Raw OCR text and complete government identifiers are never persisted in analysis.
  return { documentDetected, readability: readable ? 'good' : text.trim() ? 'poor' : 'unreadable', nameDetected,
    nameMatch, dobDetected: !!(dob || birthYear), dobMatch, identifierDetected, maskedIdentifier,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))), readinessScore, status, warnings, recommendations,
    extractedFields, evidence, dataMode: 'DEMO', verificationMode: 'SANDBOX_DOCUMENT_CHECK', disclaimer: readinessDisclaimer };
}

export async function overallReadiness(store, userId, context = {}) {
  if (context.loanType === 'EDUCATION') return educationReadiness(store, userId, context);
  const documents = await store.find('Document', { userId });
  const requiredTypes = ['AADHAAR', 'PAN', 'SALARY_SLIP', 'BANK_STATEMENT'];
  const recommendations = []; const components = { uploaded: 0, readability: 0, nameProfileMatch: 0, format: 0, coverage: 0 };
  const results = [];
  for (const type of requiredTypes) {
    const candidates = documents.filter(d => d.documentType === type);
    const analyses = (await Promise.all(candidates.map(d => store.one('DocumentAnalysis', { documentId: d._id })))).filter(Boolean);
    const best = analyses.sort((a, b) => b.readinessScore - a.readinessScore)[0];
    if (candidates.length) components.uploaded += 25;
    if (!best) { recommendations.push(candidates.length ? `Analyze your ${type} document` : `Upload a ${type} document`); continue; }
    if (best.readability === 'good') components.readability += 25;
    if (best.nameMatch === true) components.nameProfileMatch += 25;
    if (best.documentDetected) components.format += 25;
    if (best.status === 'passed') components.coverage += 25;
    recommendations.push(...best.recommendations); results.push({ documentType: type, analysis: best });
  }
  const overallScore = Math.round(Object.values(components).reduce((sum, value) => sum + value, 0) / 5);
  return { overallScore, status: overallScore >= 85 && results.length === 4 && results.every(r => r.analysis.status === 'passed') ? 'Ready' : overallScore >= 60 ? 'Almost Ready' : 'Needs Attention',
    components, requiredDocumentTypes: requiredTypes, documents: results, recommendations: [...new Set(recommendations)],
    dataMode: 'DEMO', verificationMode: 'SANDBOX_DOCUMENT_CHECK', disclaimer: readinessDisclaimer };
}
