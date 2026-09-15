import { createHash } from 'node:crypto';
import { overallReadiness } from './documentAnalysis.js';
import { matchLoan, matchScheme } from './matching.js';
import { AppError } from '../utils/errors.js';

// Ephemeral, bounded, per-user input snapshots. Never store names, identifiers or chat.
export function createMatchContextCache({ ttl = 1800000, max = 1000, now = Date.now } = {}) {
  const entries = new Map();
  return {
    put(user, kind, input) {
      if (!user) return;
      const values = Object.fromEntries(['loanType', 'age', 'employmentType', 'monthlyIncome', 'annualIncome', 'existingEmi', 'loanAmount', 'tenureYears', 'creditScoreRange'].filter(k => input[k] !== undefined).map(k => [k, input[k]]));
      const key = `${user._id}:${kind}:${input.loanType || 'HOME'}`;
      entries.delete(key);
      if (entries.size >= max) entries.delete(entries.keys().next().value);
      entries.set(key, { values, profileVersion: user.updatedAt, expires: now() + ttl });
    },
    get(user, kind, loanType) {
      const key = `${user._id}:${kind}:${loanType}`; const entry = entries.get(key);
      if (!entry || entry.expires <= now() || entry.profileVersion !== user.updatedAt) { entries.delete(key); return null; }
      return entry.values;
    },
  };
}

const priority = { BLOCKER: 0, MISSING: 1, CONFLICT: 2, UNVERIFIED: 3, REVIEW: 4, OPTIONAL: 5 };
export const copilotDisclaimer = 'Based on configured preparation rules. Extraction does not establish source authenticity. Final lending decisions remain with the lender.';

export async function buildCopilotContext(store, userId, selection, cache, scenarioAmount = null) {
  const user = await store.one('User', { _id: userId });
  if (!user) throw new AppError(401, 'Sign in again');
  let application;
  if (selection.applicationId) {
    application = await store.one('LoanApplication', { _id: selection.applicationId, userId });
    if (!application) throw new AppError(404, 'Application not found');
    if (selection.productId && selection.productId !== application.loanProductId) throw new AppError(400, 'Application product does not match');
  }
  if (!application && !selection.productId && !selection.loanType && !selection.schemeId) {
    const applications = await store.find('LoanApplication', { userId });
    application = applications.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
  }
  const productId = application?.loanProductId || selection.productId;
  const product = productId ? await store.one('LoanProduct', { _id: productId }) : null;
  if (productId && !product) throw new AppError(404, 'Product not found');
  const scheme = selection.schemeId ? await store.one('Scheme', { _id: selection.schemeId }) : null;
  if (selection.schemeId && !scheme) throw new AppError(404, 'Scheme not found');
  const loanType = product?.loanType || application?.loanType || selection.loanType || (scheme ? ['Education', 'Students'].includes(scheme.category) ? 'EDUCATION' : 'HOME' : null);
  if (selection.loanType && loanType !== selection.loanType) throw new AppError(400, 'Loan type does not match');
  if (!loanType) return null;
  const readiness = await overallReadiness(store, userId, { loanType, product });
  const uploads = await store.find('Document', { userId });
  const facts = []; const references = {}; const actions = [];
  const add = (id, text, topics, reference, category, translations) => {
    facts.push({ id, text, topics, ...(translations ? { translations } : {}) }); references[id] = { id, ...reference };
    if (category) actions.push({ factId: id, category, priority: priority[category], text });
  };
  add('readiness', `Current submission readiness: ${readiness.finalState || readiness.status}. Readiness score: ${readiness.overallScore}/100, a preparation measure.`, ['readiness'], { type: 'finding', label: 'Current readiness', href: '/documents' }, undefined, { hi:`अभी readiness: ${readiness.finalState || readiness.status}। Preparation score: ${readiness.overallScore}/100। यह loan का फैसला नहीं है।`, hinglish:`Abhi readiness: ${readiness.finalState || readiness.status}. Preparation score: ${readiness.overallScore}/100. Yeh loan ka faisla nahi hai.` });
  if (application) add('application', `Saved application status: ${application.status}. Requested ${application.loanType} loan: INR ${application.loanAmount}, tenure ${application.tenure} years.`, ['readiness','documents','match'], {type:'application',label:'Saved application',href:`/applications/${application._id}`},undefined,{hi:`Saved application status: ${application.status}। ${application.loanType} loan की राशि INR ${application.loanAmount}, tenure ${application.tenure} साल।`,hinglish:`Saved application status: ${application.status}. ${application.loanType} loan amount INR ${application.loanAmount}, tenure ${application.tenure} saal.`});
  if (readiness.finalState === 'INSUFFICIENT INFORMATION') add('profile', 'Complete the applicant name and date of birth in Profile before assessing education readiness.', ['readiness', 'blockers', 'next'], { type: 'finding', label: 'Profile incomplete', href: '/profile' }, 'BLOCKER');
  const mappings = readiness.mappings || readiness.requiredDocumentTypes.map(type => {
    const analysis = readiness.documents.find(d => d.documentType === type)?.analysis;
    const uploaded = uploads.some(d => d.documentType === type);
    return { id: type, label: type, accepts: [type], result: !uploaded ? 'MISSING' : analysis?.status === 'passed' ? 'PASS' : 'REVIEW', explanation: !uploaded ? `Upload ${type}.` : analysis?.status === 'passed' ? 'Evidence supports this configured requirement.' : `Analyze or review ${type} against the current profile.` };
  });
  for (const m of mappings) {
    const passed = m.result.startsWith('PASS');
    const explanation = m.id === 'consistency' && m.result === 'MISSING'
      ? 'Upload and analyze identity evidence before name and DOB consistency can be assessed.' : m.explanation;
    add(`requirement:${m.id}`, `${m.label}: ${m.result}. ${explanation}`, ['readiness', 'documents', ...(passed ? ['satisfied'] : ['blockers', 'next'])], { type: 'requirement', label: m.label, href: '/documents', documentTypes: m.accepts }, passed ? undefined : m.result === 'MISSING' ? 'MISSING' : 'REVIEW', {hi:`${m.label}: ${m.result}। ${passed?'यह evidence configured requirement पूरी करता है।':m.result==='MISSING'?'ज़रूरी evidence upload और analyze करें।':'इस evidence को current profile के साथ check करें; review ज़रूरी है।'}`,hinglish:`${m.label}: ${m.result}. ${passed?'Yeh evidence configured requirement poori karta hai.':m.result==='MISSING'?'Zaroori evidence upload aur analyze karein.':'Is evidence ko current profile ke saath check karein; review zaroori hai.'}`});
  }
  for (const [i, finding] of (readiness.consistency || []).entries()) {
    if (finding.status === 'MATCH') continue;
    const left = uploads.find(d => d._id === finding.left)?.documentType || 'Evidence';
    const right = uploads.find(d => d._id === finding.right)?.documentType || 'applicant profile';
    add(`conflict:${i}`, `${left} and ${right}: ${finding.field} ${finding.status}. Requires human review; this is not a fraud determination.`, ['conflicts', 'blockers', 'next'], { type: 'finding', label: `${finding.field} consistency`, href: '/documents' }, finding.field === 'address' ? 'REVIEW' : 'CONFLICT', {hi:`${left} और ${right}: ${finding.field} ${finding.status}। जानकारी check करवाएं; यह fraud का फैसला नहीं है।`,hinglish:`${left} aur ${right}: ${finding.field} ${finding.status}. Details review karwayein; yeh fraud ka faisla nahi hai.`});
  }
  const evidence = readiness.documents.map(({ documentType, analysis: a }) => ({
    documentType, status: a.status, confidence: a.confidence,
    provenance: a.evidence?.provenance?.method || 'NOT_AVAILABLE',
    sourceVerification: a.evidence?.sourceVerification?.status || 'NOT_AVAILABLE',
    fieldsPresent: Object.entries(a.evidence?.fields || {}).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k]) => k),
  }));
  for (const [i, e] of evidence.entries()) {
    add(`document:${i}`, `${e.documentType}: readiness check ${e.status}; source status ${e.sourceVerification}.`, ['documents'], {type:'evidence',label:e.documentType,href:'/documents',documentTypes:[e.documentType]}, undefined, {hi:`${e.documentType}: readiness check ${e.status} है। Source status: ${e.sourceVerification}।`,hinglish:`${e.documentType}: readiness check ${e.status} hai. Source status: ${e.sourceVerification}.`});
    if (e.sourceVerification === 'SOURCE_VERIFIED') continue;
    const failed = e.sourceVerification === 'VERIFICATION_FAILED';
    add(`evidence:${i}`, `${e.documentType}: source ${failed ? 'verification failed; resolve with the provider or lender' : 'not verified; request lender or authoritative source review when required'}. Extraction method: ${e.provenance}. This limitation does not itself change the readiness classification.`, ['unverified', 'documents', 'next', ...(failed ? ['blockers'] : [])], { type: 'evidence', label: e.documentType, href: '/documents', documentTypes: [e.documentType] }, failed ? 'BLOCKER' : 'UNVERIFIED', {hi:`${e.documentType}: source ${failed?'verification fail हुई है; provider या lender से review करवाएं':'से verify नहीं हुआ है; ज़रूरत होने पर lender या authorized source से review करवाएं'}। सिर्फ extraction से authenticity तय नहीं होती।`,hinglish:`${e.documentType}: source ${failed?'verification fail hui hai; provider ya lender se review karwayein':'se verify nahi hua hai; zaroorat par lender ya authorized source se review karwayein'}. Sirf extraction se authenticity confirm nahi hoti.`});
  }
  let matchInput = cache?.get(user, 'loan', loanType);
  if (application && matchInput && (application.loanAmount !== matchInput.loanAmount || application.tenure !== matchInput.tenureYears)) matchInput = null;
  if (scenarioAmount && matchInput) matchInput = { ...matchInput, loanAmount: scenarioAmount };
  const products = (await store.find('LoanProduct')).filter(p => p.loanType === loanType && p.enabled !== false);
  const comparisonIds = selection.comparisonProductIds || [];
  if (comparisonIds.some(id => !products.some(p => p._id === id))) throw new AppError(400, 'Comparison product not found for this loan type');
  const ranked = matchInput ? products.map(p => matchLoan(p, matchInput)).sort((a, b) => b.matchScore - a.matchScore) : [];
  if (matchInput) add('matching-input', `Matching scenario: ${loanType}, INR ${matchInput.loanAmount}, tenure ${matchInput.tenureYears} years. ${scenarioAmount?'This is a question-only scenario; your saved application has not changed.':''}`,['match','compare'],{type:'finding',label:'Matching inputs',href:'/loans'},undefined,{hi:`Matching scenario: ${loanType}, INR ${matchInput.loanAmount}, tenure ${matchInput.tenureYears} साल। ${scenarioAmount?'यह सिर्फ इस सवाल का scenario है; saved application नहीं बदली है।':''}`,hinglish:`Matching scenario: ${loanType}, INR ${matchInput.loanAmount}, tenure ${matchInput.tenureYears} saal. ${scenarioAmount?'Yeh sirf is sawal ka scenario hai; saved application nahi badli hai.':''}`});
  else add('matching-missing', "I don't have enough lender information and current matching inputs to recommend a reliable option yet. Run loan matching while signed in; earlier matching inputs expire after 30 minutes.", ['match','compare'], {type:'finding',label:'Update matching inputs',href:'/loans'},undefined,{hi:'Reliable option बताने के लिए current matching inputs पूरे नहीं हैं। Sign in करके loan matching चलाएं; पुराने inputs 30 मिनट बाद expire हो जाते हैं।',hinglish:'Reliable option batane ke liye current matching inputs poore nahi hain. Sign in karke loan matching chalayein; purane inputs 30 minute baad expire hote hain.'});
  const chosen = scheme ? null : product ? products.find(p => p._id === product._id) : ranked[0];
  const compared = scheme ? [] : comparisonIds.length ? products.filter(p => comparisonIds.includes(p._id)) : ranked.slice(0, 3);
  for (const p of [...new Map([chosen, ...compared].filter(Boolean).map(p => [p._id, p])).values()]) {
    const match = ranked.find(r => r._id === p._id);
    const index = products.findIndex(r => r._id === p._id);
    let sourceUrl;
    try { const url = new URL(p.officialUrl); if (url.protocol === 'https:' && !url.username && !url.password) sourceUrl = url.href; } catch { /* No source URL was configured. */ }
    add(`product:${index}`, `${p.name} (${p.loanType}, ${p.dataMode}): configured annual rate ${p.interestRateMin}–${p.interestRateMax}%, maximum amount INR ${p.maxLoan}, maximum tenure ${p.maxTenureYears} years, minimum monthly income INR ${p.minIncome}. Required documents: ${p.documentsRequired.join(', ')}. ${match ? `Match score ${match.matchScore}/100, a configured ranking measure. Reasons: ${match.reasons.join('; ')}. Review: ${match.warnings.join('; ') || 'No matching warnings'}.` : 'Personal match reasons unavailable. Run matching while signed in to refresh your input.'}`, [...(compared.some(c => c._id === p._id) ? ['compare'] : []), ...(p._id === chosen?._id ? ['match'] : [])], { type: 'product', label: p.name, href: `/loans/${p._id}`, ...(sourceUrl ? { sourceUrl } : {}) });
  }
  for (const fact of facts.filter(f=>f.id.startsWith('product:'))) {
    const p=products[Number(fact.id.split(':')[1])];const match=ranked.find(r=>r._id===p._id);
    const cost=`${p.name} (${p.dataMode}), ${p.interestRateMin.toFixed(2)}–${p.interestRateMax.toFixed(2)}%`;
    fact.translations={
      hi:`${cost} indicative annual rate। अधिकतम राशि INR ${p.maxLoan}, tenure ${p.maxTenureYears} साल, minimum monthly income INR ${p.minIncome}। ज़रूरी documents: ${p.documentsRequired.join(', ')}। ${match?`Configured match score ${match.matchScore}/100 है। कारण: ${match.reasons.join('; ')}। Review: ${match.warnings.join('; ') || 'कोई matching warning नहीं'}।`:'Personal match reasons उपलब्ध नहीं हैं; sign in करके matching फिर चलाएं।'}`,
      hinglish:`${cost} indicative annual rate. Maximum amount INR ${p.maxLoan}, tenure ${p.maxTenureYears} saal, minimum monthly income INR ${p.minIncome}. Zaroori documents: ${p.documentsRequired.join(', ')}. ${match?`Configured match score ${match.matchScore}/100 hai. Reasons: ${match.reasons.join('; ')}. Review: ${match.warnings.join('; ') || 'Koi matching warning nahi'}.`:'Personal match reasons available nahi hain; sign in karke matching phir chalayein.'}`
    };
  }
  const schemeInput = cache?.get(user, 'scheme', loanType);
  if (scheme) {
    const match = schemeInput ? matchScheme(scheme, schemeInput) : null;
    add('scheme', `${scheme.name}: ${match ? `Configured match reasons: ${match.reasons.join('; ')}. Review: ${match.warnings.join('; ')}.` : 'Personal scheme match reasons unavailable. Run scheme matching while signed in.'}`, ['match', 'compare'], { type: 'scheme', label: scheme.name, href: `/schemes/${scheme._id}` });
  }
  add('limits', "I don't have enough information in your current application to answer that reliably. Co-applicant underwriting, institution or course eligibility conditions, and lending decisions are unavailable in this context. Only configured requirements can be explained.", ['unavailable'], { type: 'scope', label: 'Context limits' },undefined,{hi:'आपकी current application में यह बात reliably बताने के लिए पूरी जानकारी नहीं है। Loan का फैसला, co-applicant underwriting और unconfigured eligibility conditions यहाँ उपलब्ध नहीं हैं।',hinglish:'Aapki current application mein yeh reliably batane ke liye poori information nahi hai. Loan ka faisla, co-applicant underwriting aur unconfigured eligibility conditions yahan available nahi hain.'});
  actions.sort((a, b) => a.priority - b.priority);
  const modelContext = { loanType, applicant: { profileComplete: !!(user.name && user.profile?.dob), ...(matchInput ? { matchingInput: matchInput } : {}) }, evidence, facts, nextActionIds: actions.map(a => a.factId) };
  const version = createHash('sha256').update(JSON.stringify(modelContext)).digest('hex').slice(0, 16);
  return { modelContext, references, actions, version,
    summary: { loanType, productName: product?.name || chosen?.name || null, state: readiness.finalState || readiness.status, blockers: actions.filter(a => ['BLOCKER', 'MISSING', 'CONFLICT'].includes(a.category)).length, review: mappings.filter(m => m.result === 'REVIEW').length, satisfied: mappings.filter(m => m.result.startsWith('PASS')).length, unverified: evidence.filter(e => e.sourceVerification !== 'SOURCE_VERIFIED').length },
    // Used only to remove known personal fields from the question; never serialized to a provider/client.
    privateValues: [user.name, user.email, user.phone, user.profile?.dob, user.profile?.city, ...readiness.documents.flatMap(d => Object.entries(d.analysis.evidence?.fields || {}).filter(([k]) => ['name', 'dob', 'address', 'maskedIdentifier', 'institution', 'course'].includes(k)).map(([, v]) => v))].filter(v => typeof v === 'string' && v.length > 2),
  };
}

export function minimizeQuestion(message, privateValues) {
  let text = message;
  for (const value of privateValues) text = text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[personal detail]');
  return text.replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[email]').replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, '[identifier]').replace(/\b\d[\d\s()+/-]{7,}\d\b/g, '[numeric detail]');
}
