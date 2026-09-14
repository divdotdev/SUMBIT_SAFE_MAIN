import { consistencyChecks, compareField } from './evidence.js';
export const educationRequirements = [
  { id: 'identity', label: 'Identity proof', accepts: ['AADHAAR', 'DRIVING_LICENCE'] },
  { id: 'pan', label: 'PAN requirement', accepts: ['PAN'] },
  { id: 'income', label: 'Applicant income evidence', accepts: ['SALARY_SLIP'] },
  { id: 'bank', label: 'Three-month bank statement', accepts: ['BANK_STATEMENT'] },
  { id: 'admission', label: 'Admission evidence', accepts: ['ADMISSION_LETTER'] },
  { id: 'fees', label: 'Course fee evidence', accepts: ['FEE_SCHEDULE'] },
];
export async function educationReadiness(store, userId, { product } = {}) {
  const user = await store.one('User', { _id: userId });
  const uploaded = await store.find('Document', { userId });
  // Latest upload per type is authoritative for preparation; a failed replacement cannot
  // disappear behind a previously high-scoring document. All active identity types compare.
  const latest = new Map();
  for (const doc of [...uploaded].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) latest.set(doc.documentType, doc);
  const documents = await Promise.all([...latest.values()].map(async doc => ({ documentType: doc.documentType, documentId: doc._id, analysis: await store.one('DocumentAnalysis', { documentId: doc._id }) })));
  const consistency = consistencyChecks(documents, user);
  const required = [...educationRequirements];
  for (const type of product?.documentsRequired || []) {
    if (!required.some(r => r.accepts.includes(type))) required.push({ id: `product-${type}`, label: `Product requirement: ${type}`, accepts: [type] });
  }
  // A specific product may explicitly require Aadhaar or DL instead of either identity.
  const productIdentity = product?.documentsRequired?.filter(type => ['AADHAAR', 'DRIVING_LICENCE'].includes(type));
  if (productIdentity?.length) {
    required[0] = { ...required[0], accepts: [productIdentity[0]] };
    for (const type of productIdentity.slice(1)) required.push({ id: `product-${type}`, label: `Additional identity: ${type}`, accepts: [type] });
  }
  const mappings = required.map(requirement => {
    const candidates = documents.filter(d => requirement.accepts.includes(d.documentType));
    const evidence = candidates.map(d => ({ documentId: d.documentId, documentType: d.documentType,
      provenance: d.analysis?.evidence?.provenance || { method: 'NOT_ANALYZED', origin: 'USER_UPLOAD' },
      sourceVerification: d.analysis?.evidence?.sourceVerification || { status: 'NOT_AVAILABLE', explanation: 'Analyze this document first.' } }));
    let result = 'MISSING'; let explanation = `Upload ${requirement.accepts.join(' or ')}.`;
    if (candidates.length) {
      const passing = candidates.find(d => {
        const a = d.analysis; const f = a?.evidence?.fields;
        const coverage = d.documentType === 'ADMISSION_LETTER' ? !!(f?.institution && f.course)
          : d.documentType === 'FEE_SCHEDULE' ? !!(f?.institution && f.totalFee > 0)
          : d.documentType === 'BANK_STATEMENT' ? a?.extractedFields?.monthsCovered >= 3 && a.extractedFields.statementPeriodDetected
          : d.documentType === 'SALARY_SLIP' ? a?.extractedFields?.monthDetected && a.extractedFields.employerDetected && a.extractedFields.netSalary > 0 && a.extractedFields.grossSalary > 0
          : d.documentType === 'DRIVING_LICENCE' ? !!f?.identifierFormatValid && (!f.validUntil || f.validUntil >= new Date().toISOString().slice(0, 10)) : !!f?.identifierFormatValid;
        return coverage && a?.status === 'passed' && f?.name && compareField(f.name, user.name, 'name') === 'MATCH'
          && a.evidence.sourceVerification.status !== 'VERIFICATION_FAILED';
      });
      if (passing) {
        result = requirement.id === 'pan' ? 'PASS' : 'PASS WITH VERIFICATION LIMITATION';
        explanation = requirement.id === 'pan' ? 'PAN format and extracted holder data satisfy the configured requirement. This is not government verification.' : 'Extracted evidence satisfies this configured requirement; source authenticity remains unverified.';
      } else { result = 'REVIEW'; explanation = 'Analyze the latest upload or resolve unreadable, incomplete, mismatched or failed evidence.'; }
    }
    return { ...requirement, evidence, result, explanation };
  });
  const critical = consistency.filter(c => c.field !== 'address');
  const conflict = critical.some(c => c.status !== 'MATCH') || consistency.some(c => c.field === 'address' && c.status === 'UNCERTAIN' && (() => {
    const left = documents.find(d => d.documentId === c.left)?.analysis?.evidence?.fields.address;
    const right = documents.find(d => d.documentId === c.right)?.analysis?.evidence?.fields.address;
    return left && right;
  })());
  const identityEvidence = documents.filter(d => ['AADHAAR', 'PAN', 'DRIVING_LICENCE'].includes(d.documentType));
  const incompleteIdentity = identityEvidence.some(d => !d.analysis?.evidence || d.analysis.readability !== 'good' || !d.analysis.documentDetected || !d.analysis.identifierDetected || (d.documentType === 'DRIVING_LICENCE' && d.analysis.evidence.fields.validUntil && d.analysis.evidence.fields.validUntil < new Date().toISOString().slice(0, 10)) || d.analysis.evidence.sourceVerification.status === 'VERIFICATION_FAILED');
  mappings.push({ id: 'consistency', label: 'Applicant name and DOB consistency', accepts: [],
    evidence: identityEvidence.map(d => ({ documentId: d.documentId, documentType: d.documentType, provenance: d.analysis?.evidence?.provenance || { method: 'NOT_ANALYZED' }, sourceVerification: d.analysis?.evidence?.sourceVerification || { status: 'NOT_AVAILABLE' } })),
    result: !identityEvidence.length ? 'MISSING' : conflict || incompleteIdentity ? 'REVIEW' : 'PASS',
    explanation: conflict || incompleteIdentity ? 'Possible variation, conflicting or incomplete evidence requires human review. This is not a fraud determination.' : 'Available identity fields agree with one another and the current applicant profile. Missing addresses are not compared.' });
  const enoughProfile = !!(user?.name && user.profile?.dob);
  const state = !enoughProfile ? 'INSUFFICIENT INFORMATION' : mappings.some(m => m.result === 'MISSING') ? 'NOT READY' : mappings.some(m => m.result === 'REVIEW') ? 'REVIEW REQUIRED' : 'READY FOR LENDER REVIEW';
  const passed = mappings.filter(m => m.result.startsWith('PASS')).length;
  return { loanType: 'EDUCATION', productId: product?._id || null, productName: product?.name || null, requirementsVersion: 'education-demo-v1',
    overallScore: Math.round(passed / mappings.length * 100), finalState: state, status: state === 'READY FOR LENDER REVIEW' ? 'Ready' : state === 'REVIEW REQUIRED' ? 'Almost Ready' : 'Needs Attention',
    requiredDocumentTypes: [...new Set(required.flatMap(r => r.accepts))], documents: documents.filter(d => d.analysis), mappings, consistency,
    recommendations: [...(!enoughProfile ? ['Complete the applicant name and date of birth in Profile.'] : []), ...mappings.filter(m => !m.result.startsWith('PASS')).map(m => `${m.label}: ${m.explanation}`)],
    dataMode: 'DEMO', verificationMode: 'SANDBOX_DOCUMENT_CHECK',
    disclaimer: 'Configured demo preparation only. Sources are not verified. Final lender/authority decisions remain external; this is not loan approval. Applicant income is a simplified demo rule; co-applicant underwriting is not implemented.' };
}
