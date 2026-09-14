import { randomUUID } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { audit } from '../services/access.js';
import { overallReadiness } from '../services/documentAnalysis.js';

const mean = values => values.length ? Math.round(values.reduce((a,b) => a+b, 0)/values.length) : null;
const count = (rows, status) => rows.filter(a => a.status === status).length;
const pick = (row, fields) => Object.fromEntries(fields.map(key => [key, row[key] ?? null]));
const activeConsent = (consent, app) => consent && !consent.revokedAt && consent.userId === app.userId && consent.purpose === 'LENDER_DATA_SHARE' && consent.sharedWith === app.loanProductId;
const age = dob => { if (!dob) return null; const today = new Date(); const born = new Date(dob); return today.getUTCFullYear()-born.getUTCFullYear()-((today.getUTCMonth()<born.getUTCMonth() || today.getUTCMonth()===born.getUTCMonth() && today.getUTCDate()<born.getUTCDate())?1:0); };

export function operationsController(store, config) {
  async function sharedLead(user, app) {
    if (!user.partnerProductIds?.includes(app.loanProductId)) return null;
    const consent = await store.one('Consent', { _id: app.consentId });
    if (!activeConsent(consent, app)) return null;
    const product = await store.one('LoanProduct', { _id: app.loanProductId });
    if (!product) return null;
    // Reuse readiness while limiting its document inputs to the applicant's explicit share.
    const scopedStore = { one: store.one.bind(store), find: async (model, filter) => {
      const rows = await store.find(model, filter);
      return model === 'Document' ? rows.filter(doc => consent.documentIds.includes(doc._id)) : rows;
    } };
    const readiness = await overallReadiness(scopedStore, app.userId, { loanType: app.loanType, product });
    return { app, consent, readiness, product };
  }
  const leadRow = ({ app, readiness, product }) => ({ ...pick(app, ['_id', 'applicationCode', 'loanType', 'loanAmount', 'tenure', 'status', 'createdAt', 'partnerNote']), applicantId: app.userId, lender: product.name, partnerStage: app.partnerStage || 'New', readinessScore: readiness.overallScore, documentStatus: readiness.status, consent: 'Active' });
  async function getLead(req) {
    const app = await store.one('LoanApplication', { _id: req.params.id });
    const result = app && await sharedLead(req.user, app);
    if (!result) throw new AppError(404, 'Lead is unavailable or its lender-sharing consent has ended', 'NOT_FOUND');
    return result;
  }
  return {
    metrics: async (req, res) => {
      const [users, apps, docs, checks, events, requests] = await Promise.all(['User','LoanApplication','Document','DocumentAnalysis','AuditLog','AgentRequest'].map(m => store.find(m)));
      const applicants = users.filter(u => u.role === 'user');
      const scores = await Promise.all(applicants.filter(u => docs.some(d => d.userId===u._id)).map(async u => (await overallReadiness(store, u._id)).overallScore));
      const eventsOf = action => events.filter(e => e.action===action);
      res.json({ dataMode: config.appMode === 'MOCK' ? 'DEMO' : 'LIVE', metrics: {
        'Total Users': users.length, 'Loan Searches': eventsOf('LOAN_SEARCH').length, 'Matched Users': new Set(eventsOf('LOAN_MATCH').map(e=>e.userId).filter(Boolean)).size,
        Applications: apps.length, 'Documents Checked': checks.length, 'Average Readiness': mean(scores), 'Scheme Searches': eventsOf('SCHEME_SEARCH').length, 'Agent Requests': requests.length,
        'Profiles Started': applicants.length, 'Loan Matches': eventsOf('LOAN_MATCH').length, 'Documents Uploaded': docs.length, 'Applications Ready': count(apps,'Ready'),
        'Applications Submitted': count(apps,'Submitted'), 'Scheme Matches': eventsOf('SCHEME_MATCH').length,
      }, explanation: 'Counts use local records. Search/match events start with this release; one match event means a search returned at least one potential match (scheme: configured criteria met). Matched Users counts signed-in users only. Application statuses are current, not cumulative. Average Readiness uses the existing Home checklist for applicants with uploads; empty averages are unavailable.' });
    },
    adminList: async (req, res) => {
      const section = req.params.section;
      const map = { users:'User', applications:'LoanApplication', documents:'Document', loans:'LoanProduct', schemes:'Scheme', agents:'Agent', consents:'Consent', audit:'AuditLog' };
      if (!map[section]) throw new AppError(404, 'Admin section not found');
      let rows = await store.find(map[section]);
      if (section==='users') rows = rows.map(u => pick(u,['_id','name','email','role','createdAt']));
      if (section==='documents') rows = await Promise.all(rows.map(async d => { const a = await store.one('DocumentAnalysis',{ documentId:d._id }); return { ...pick(d,['_id','userId','documentType','status','createdAt']), readinessScore:a?.readinessScore ?? null, sourceVerification:a?.evidence?.sourceVerification?.status || 'Not checked' }; }));
      const extra = section==='agents' ? { requests: await store.find('AgentRequest'), applications: [], applicationNote: 'Agent self-application intake is not implemented. These are configured demo profiles, not submitted agent applications.', products:(await store.find('LoanProduct')).map(p=>pick(p,['_id','name','loanType'])) } : {};
      res.json({ data:rows, ...extra });
    },
    saveCatalog: section => async (req, res) => {
      const model = section==='loans'?'LoanProduct':'Scheme';
      if (req.params.id && !await store.one(model,{_id:req.params.id})) throw new AppError(404,'Record not found');
      const values = { ...req.body, officialUrl: req.body.officialUrl || null, dataMode:'DEMO', ...(section==='loans'?{lastUpdated:new Date()}:{} ) };
      const record = req.params.id ? await store.update(model,req.params.id,values) : await store.create(model,{...values,slug:`configured-${randomUUID()}`});
      await audit(store,req.user._id,`ADMIN_${section.toUpperCase()}_SAVED`,record._id);
      res.status(req.params.id?200:201).json({data:record});
    },
    agentUpdate: async (req,res) => {
      if (!await store.one('Agent',{_id:req.params.id})) throw new AppError(404,'Agent not found');
      const data=await store.update('Agent',req.params.id,req.body); await audit(store,req.user._id,'ADMIN_AGENT_UPDATED',data._id); res.json({data});
    },
    requestUpdate: async (req,res) => {
      const request = await store.one('AgentRequest',{_id:req.params.id});
      if (!request) throw new AppError(404,'Request not found');
      const consent = await store.one('Consent',{_id:request.consentId});
      const agent = await store.one('Agent',{_id:request.agentId});
      if (!consent || consent.revokedAt || consent.userId!==request.userId || consent.purpose!=='AGENT_ASSISTANCE' || consent.sharedWith!==request.agentId || agent?.demoVerification==='Suspended') throw new AppError(409,'Active agent consent and an available agent are required');
      const data=await store.update('AgentRequest',request._id,req.body); await audit(store,req.user._id,'ADMIN_AGENT_REQUEST_UPDATED',data._id); res.json({data});
    },
    leads: async (req,res) => {
      const rows = (await Promise.all((await store.find('LoanApplication')).map(a=>sharedLead(req.user,a)))).filter(Boolean).map(leadRow);
      res.json({data:rows, metrics:{'New Applicant Leads':rows.filter(a=>a.partnerStage==='New').length, 'Document Ready Leads':rows.filter(a=>a.documentStatus==='Ready').length, 'Applications Submitted':count(rows,'Submitted'), 'Under Review':rows.filter(a=>a.partnerStage==='Under Review').length, Completed:rows.filter(a=>a.partnerStage==='Completed').length, 'Conversion Rate':rows.length?Math.round(rows.filter(a=>a.partnerStage==='Completed').length/rows.length*100):null, 'Average Readiness Score':mean(rows.map(a=>a.readinessScore))}});
    },
    lead: async (req,res) => {
      const shared = await getLead(req); const user=await store.one('User',{_id:shared.app.userId});
      if (!user) throw new AppError(404,'Applicant unavailable');
      const docs = await store.find('Document',{userId:user._id});
      const checks = await Promise.all(docs.filter(d=>shared.consent.documentIds.includes(d._id)).map(async d=>({documentType:d.documentType,status:(await store.one('DocumentAnalysis',{documentId:d._id}))?.status || 'uploaded'})));
      // No normalized identity fields, date of birth, phone, email, file paths or identifiers leave this endpoint.
      res.json({data:{...leadRow(shared), applicant:{name:user.name,age:age(user.profile?.dob),monthlyIncome:user.profile?.monthlyIncome ?? null,employmentType:user.profile?.employmentType || 'Not provided'}, documents:checks, consentMessage:'User consented to share with this lender'}});
    },
    leadUpdate: async (req,res) => {
      const shared=await getLead(req); const stage=shared.app.partnerStage || 'New';
      const targets={accept:'Accepted',review:'Under Review','request-document':'Documents Pending',reject:'Rejected',complete:'Completed'};
      const allowed={New:['accept','request-document','reject'],Accepted:['review','request-document','reject'],'Under Review':['complete','request-document','reject'],'Documents Pending':['review','reject'],Rejected:[],Completed:[]};
      if (!allowed[stage].includes(req.body.action)) throw new AppError(409,'Choose an action available for the current lead stage');
      if (req.body.action==='complete' && shared.readiness.status!=='Ready') throw new AppError(409,'Shared documents must be ready before completing this demo workflow');
      if (req.body.action==='request-document' && !req.body.note) throw new AppError(400,'Describe the additional document needed');
      await getLead(req); // Recheck consent after readiness work, before local persistence.
      const data=await store.update('LoanApplication',shared.app._id,{partnerStage:targets[req.body.action],partnerNote:req.body.note});
      await audit(store,req.user._id,`PARTNER_${req.body.action.toUpperCase().replaceAll('-','_')}`,data._id);
      res.json({message:'Demo partner workflow updated locally. No lender was contacted.',partnerStage:data.partnerStage});
    },
  };
}
