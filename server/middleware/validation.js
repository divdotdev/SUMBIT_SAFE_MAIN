import { z } from 'zod';
export const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
// These profile fields must never become an alternative store for government IDs.
export const safeText = z.string().trim().min(1).max(120).refine(v => !/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b/i.test(v), 'Do not include government identifiers');
export const phone = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Use a valid international phone number');
export const income = z.number().finite().min(0).max(1e10);
export const profile = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return Number.isFinite(+d) && d.toISOString().slice(0, 10) === v && d <= new Date() && +v.slice(0, 4) >= 1900; }, 'Invalid date of birth').optional(),
  city: safeText.optional(), employmentType: z.enum(['salaried', 'self-employed', 'business', 'student', 'farmer', 'unemployed', 'other']).optional(), monthlyIncome: income.optional(),
}).strict();
export const matchInput = z.object({ loanType: z.enum(['HOME', 'EDUCATION']).default('HOME'), name: safeText.optional(), age: z.number().int().min(18).max(100), city: safeText.optional(),
  employmentType: z.enum(['salaried', 'self-employed', 'business', 'student', 'farmer', 'unemployed', 'other']),
  monthlyIncome: income.optional(), annualIncome: income.optional(), existingEmi: income.default(0),
  loanAmount: z.number().positive().max(1e10), tenureYears: z.number().int().min(1).max(40),
  creditScoreRange: z.union([z.number().int().min(300).max(900), z.enum(['300-549', '550-649', '650-699', '700-749', '750-799', '800-900', 'unknown'])]).default('unknown'),
}).strict().refine(v => v.monthlyIncome !== undefined || v.annualIncome !== undefined, 'Provide monthlyIncome or annualIncome')
  .refine(v => v.monthlyIncome === undefined || v.annualIncome === undefined || Math.abs(v.monthlyIncome * 12 - v.annualIncome) <= 12, 'Monthly and annual income must be consistent');
export function validate(schema) { return (req, res, next) => { req.body = schema.parse(req.body); next(); }; }
export function validateId(req, res, next) { id.parse(req.params.id); next(); }
export { z };
