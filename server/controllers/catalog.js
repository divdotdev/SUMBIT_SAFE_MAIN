import { AppError } from '../utils/errors.js';
import { matchLoan, matchScheme } from '../services/matching.js';
export function catalogController(store) {
  const detail = model => async (req, res) => {
    const result = await store.one(model, { _id: req.params.id });
    if (!result) throw new AppError(404, 'Record not found', 'NOT_FOUND');
    res.json({ data: result });
  };
  const list = model => async (req, res) => {
    let records = await store.find(model);
    if (model === 'Scheme' && typeof req.query.category === 'string') records = records.filter(s => s.category.toLowerCase() === req.query.category.toLowerCase());
    if (model === 'Agent' && typeof req.query.city === 'string') records = records.filter(a => a.city.toLowerCase() === req.query.city.toLowerCase());
    res.json({ data: records, count: records.length });
  };
  return { loans: list('LoanProduct'), loan: detail('LoanProduct'), schemes: list('Scheme'), scheme: detail('Scheme'), agents: list('Agent'), agent: detail('Agent'),
    matchLoans: async (req, res) => res.json({ data: (await store.find('LoanProduct')).map(l => matchLoan(l, req.body)).sort((a, b) => b.matchScore - a.matchScore) }),
    compareLoans: async (req, res) => {
      const products = await Promise.all(req.body.loanProductIds.map(_id => store.one('LoanProduct', { _id })));
      if (products.some(p => !p)) throw new AppError(404, 'Loan product not found', 'NOT_FOUND');
      res.json({ data: products.map(l => matchLoan(l, req.body.profile)) });
    },
    matchSchemes: async (req, res) => res.json({ data: (await store.find('Scheme')).map(s => matchScheme(s, req.body)).sort((a, b) => b.matchScore - a.matchScore) }),
  };
}
