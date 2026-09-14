import bcrypt from 'bcrypt';
export const lenders = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'Bank of Baroda'].map((name, index) => ({
  name: `${name} Demo Home Loan`, slug: `${name.toLowerCase().replaceAll(' ', '-')}-demo-home-loan`, loanType: 'HOME', dataMode: 'DEMO',
  interestRateMin: 8.3 + index * 0.15, interestRateMax: 10.5 + index * 0.2, apr: 9.1 + index * 0.15,
  processingFee: 0.5, minIncome: 25000 + index * 2500, minAge: 21, maxAge: 70, maxTenureYears: 30,
  maxLoan: 10000000 + index * 1000000, recommendedCreditScore: 700 + (index % 3) * 25,
  prepaymentCharges: 'Demo: subject to product terms; confirm with lender',
  features: ['Illustrative reducing-balance EMI', 'Demo values, not a current lender quotation'],
  documentsRequired: ['AADHAAR', 'PAN', 'SALARY_SLIP', 'BANK_STATEMENT'], officialUrl: null,
  partnerStatus: 'DEMO_NOT_PARTNERED', lastUpdated: new Date('2026-01-01T00:00:00Z'),
}));
const schemeSpecs = [
  ['Student Tuition Support', 'Education', ['student'], 16, 35],
  ['Higher Studies Support', 'Education', ['student'], 18, 40],
  ['First Home Assistance', 'Housing', [], 21, 65],
  ['Affordable Housing Support', 'Housing', [], 21, 70],
  ['Student Equipment Grant', 'Students', ['student'], 16, 30],
  ['Skills Training Assistance', 'Students', ['student', 'unemployed'], 18, 40],
  ['Micro Enterprise Support', 'MSME', ['self-employed', 'business'], 21, 65],
  ['Small Business Equipment', 'MSME', ['self-employed', 'business'], 21, 65],
  ['Women Enterprise Support', 'Women', ['self-employed', 'business'], 18, 65],
  ['Women Skills Assistance', 'Women', [], 18, 60],
  ['Farm Equipment Assistance', 'Agriculture', ['farmer'], 18, 70],
  ['Irrigation Improvement', 'Agriculture', ['farmer'], 18, 70],
  ['New Business Assistance', 'Business', ['business', 'self-employed'], 21, 60],
  ['Local Enterprise Growth', 'Business', ['business', 'self-employed'], 21, 65],
  ['Household Welfare Support', 'Social welfare', [], 18, 100],
  ['Senior Household Assistance', 'Social welfare', [], 60, 100],
];
export const schemes = schemeSpecs.map(([name, category, employmentTypes, minAge, maxAge], i) => ({
  name: `Demo ${name}`, slug: name.toLowerCase().replaceAll(' ', '-'), category, employmentTypes, minAge, maxAge,
  maxAnnualIncome: 300000 + (i % 4) * 200000,
  description: 'Fictional scheme for sandbox matching. This is not an official government program or eligibility decision.',
  benefits: ['Illustrative assistance; no benefit amount is promised'], documentsRequired: ['Identity document', 'Income evidence'], dataMode: 'DEMO',
}));
export const agents = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur'].map((city, i) => ({
  name: `Demo Assistance Agent ${i + 1}`, slug: `demo-agent-${i + 1}`, city, languages: ['English', 'Hindi'],
  specialties: [i % 2 ? 'Schemes' : 'Home loans', 'Document readiness'], dataMode: 'DEMO',
  description: 'Fictional sandbox agent. No real person will be contacted.',
}));
export async function seed(store) {
  if (store.config.appMode !== 'MOCK') throw new Error('Demo seeding is disabled in LIVE mode');
  for (const [model, records] of [['LoanProduct', lenders], ['Scheme', schemes], ['Agent', agents]]) {
    for (const record of records) if (!await store.one(model, { slug: record.slug })) await store.create(model, record);
  }
  if (!await store.one('User', { email: 'demo@submitsafe.in' })) await store.create('User', {
    name: 'Demo User', email: 'demo@submitsafe.in', passwordHash: await bcrypt.hash('Demo@123', 12), role: 'user',
    profile: { dob: '1995-01-01', city: 'Delhi', employmentType: 'salaried', monthlyIncome: 75000 },
  });
  return { lenders: lenders.length, schemes: schemes.length, agents: agents.length, demoUser: 'demo@submitsafe.in' };
}
