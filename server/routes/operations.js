import { Router } from 'express';
import { z, id, safeText, validate, validateId } from '../middleware/validation.js';
import { documentTypes } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { operationsController } from '../controllers/operations.js';

const text = safeText;
const optionalText = text.or(z.literal('')).default('');
const list = z.array(text).max(30).default([]);
const number = z.number().finite().min(0).max(1e10);
const url = z.string().max(500).refine(v => {
  if (!v) return true;
  try { const parsed = new URL(v); return parsed.protocol === 'https:' && !parsed.username && !parsed.password; }
  catch { return false; }
}, 'Use a public HTTPS link without credentials').nullable().default(null);
const loanInput = z.object({ name: text, loanType: z.enum(['HOME', 'EDUCATION']), interestRateMin: number.max(100), interestRateMax: number.max(100), apr: number.max(100), processingFee: number.max(100), minIncome: number, minAge: number.int().min(18).max(100), maxAge: number.int().min(18).max(100), maxTenureYears: number.int().min(1).max(40), maxLoan: number.positive(), recommendedCreditScore: number.int().min(300).max(900), employmentTypes: z.array(z.enum(['salaried','self-employed','business','student','farmer','unemployed','other'])).max(7), documentsRequired: z.array(z.enum(documentTypes)).min(1).max(7), partnerStatus: z.literal('DEMO_NOT_PARTNERED'), officialUrl: url, enabled: z.boolean(), features: list, prepaymentCharges: optionalText }).strict().refine(v => v.minAge <= v.maxAge && v.interestRateMin <= v.interestRateMax, 'Check age and rate ranges');
const schemeInput = z.object({ name: text, category: text, description: text, ministry: optionalText, benefits: list, eligibility: optionalText, minAge: number.int().max(120), maxAge: number.int().max(120), maxAnnualIncome: number, employmentTypes: list, documentsRequired: list, officialUrl: url, source: optionalText, lastVerified: z.iso.date().refine(v => v <= new Date().toISOString().slice(0,10), 'Verification date cannot be in the future').nullable(), enabled: z.boolean() }).strict().refine(v => v.minAge <= v.maxAge, 'Check age range');
export const agentStatuses = ['Requested', 'Accepted', 'Contacted', 'Documents Pending', 'Application Ready', 'Completed'];
export function operationsRoutes(store, config, secured) {
  const router = Router(); const c = operationsController(store, config);
  const role = expected => (req, res, next) => { if (req.user.role !== expected) throw new AppError(403, `This area requires the ${expected} role`, 'FORBIDDEN'); next(); };
  const mock = (req, res, next) => { if (config.appMode !== 'MOCK') throw new AppError(403, 'These management actions are available only in MOCK mode', 'MOCK_ONLY'); next(); };
  router.use('/admin', secured, role('admin'));
  router.use('/partner', secured, role('partner'), mock);
  router.get('/admin/metrics', c.metrics);
  router.get('/admin/:section', c.adminList);
  for (const [section, schema] of [['loans', loanInput], ['schemes', schemeInput]]) {
    router.post(`/admin/${section}`, mock, validate(schema), c.saveCatalog(section));
    router.put(`/admin/${section}/:id`, mock, validateId, validate(schema), c.saveCatalog(section));
  }
  router.patch('/admin/agents/:id', mock, validateId, validate(z.object({ demoVerification: z.enum(['Unverified', 'Demo verified', 'Suspended']) }).strict()), c.agentUpdate);
  router.patch('/admin/agent-requests/:id', mock, validateId, validate(z.object({ status: z.enum(agentStatuses) }).strict()), c.requestUpdate);
  router.get('/partner/leads', c.leads);
  router.get('/partner/leads/:id', validateId, c.lead);
  router.patch('/partner/leads/:id', validateId, validate(z.object({ action: z.enum(['accept', 'review', 'request-document', 'reject', 'complete']), note: optionalText }).strict()), c.leadUpdate);
  return router;
}
