import { AppError } from '../utils/errors.js';
import { matchLoan, matchScheme } from '../services/matching.js';
import { audit } from '../services/access.js';
const available = row => row.enabled !== false && row.demoVerification !== 'Suspended';
export function catalogController(store, matchCache) {
  const detail = model => async (req, res) => {
    const result = await store.one(model, { _id: req.params.id });
    // A disabled product is unavailable for new selections, but owners can still read their saved application.
    const savedApplication = result && model === 'LoanProduct' && req.user && await store.one('LoanApplication', { loanProductId: result._id, userId: req.user._id });
    if (!result || (!available(result) && !savedApplication)) throw new AppError(404, 'Record is unavailable', 'NOT_FOUND');
    res.json({ data: result });
  };
  const list = model => async (req, res) => {
    let records = (await store.find(model)).filter(available);
    if (model === 'LoanProduct') records = records.filter(l => req.query.loanType === 'ALL' || l.loanType === (req.query.loanType || 'HOME'));
    if (model === 'Scheme' && typeof req.query.category === 'string') records = records.filter(s => s.category.toLowerCase() === req.query.category.toLowerCase());
    if (model === 'Agent' && typeof req.query.city === 'string') records = records.filter(a => a.city.toLowerCase() === req.query.city.toLowerCase());
    res.json({ data: records, count: records.length });
  };
  return { loans: list('LoanProduct'), loan: detail('LoanProduct'), schemes: list('Scheme'), scheme: detail('Scheme'), agents: list('Agent'), agent: detail('Agent'),
    matchLoans: async (req, res) => {
      matchCache?.put(req.user, 'loan', req.body);
      const data = (await store.find('LoanProduct')).filter(l => available(l) && l.loanType === req.body.loanType).map(l => matchLoan(l, req.body)).sort((a, b) => b.matchScore - a.matchScore);
      await audit(store, req.user?._id, 'LOAN_SEARCH');
      if (data.some(l => l.potentialMatch)) await audit(store, req.user?._id, 'LOAN_MATCH');
      res.json({ data });
    },
    compareLoans: async (req, res) => {
      const products = await Promise.all(req.body.loanProductIds.map(_id => store.one('LoanProduct', { _id })));
      if (products.some(p => !p || !available(p))) throw new AppError(404, 'Loan product is unavailable', 'NOT_FOUND');
      if (products.some(p => p.loanType !== req.body.profile.loanType)) throw new AppError(400, 'Compare products of the selected loan type');
      matchCache?.put(req.user, 'loan', req.body.profile);
      res.json({ data: products.map(l => matchLoan(l, req.body.profile)) });
    },
    matchSchemes: async (req, res) => {
      matchCache?.put(req.user, 'scheme', req.body);
      const data = (await store.find('Scheme')).filter(s => available(s) && (req.body.loanType !== 'EDUCATION' || ['Education', 'Students'].includes(s.category))).map(s => matchScheme(s, req.body)).sort((a, b) => b.matchScore - a.matchScore);
      await audit(store, req.user?._id, 'SCHEME_SEARCH');
      if (data.some(s => s.meetsConfiguredCriteria)) await audit(store, req.user?._id, 'SCHEME_MATCH');
      res.json({ data });
    },
  };
}
