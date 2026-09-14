import { calculateEmi } from '../utils/emi.js';
export function matchLoan(loan, input) {
  let matchScore = 0; const reasons = []; const warnings = [];
  const income = input.monthlyIncome ?? input.annualIncome / 12;
  const emi = calculateEmi(input.loanAmount, loan.interestRateMin, input.tenureYears);
  const credit = typeof input.creditScoreRange === 'number' ? input.creditScoreRange : Number(input.creditScoreRange?.match(/^\d{3}/)?.[0] || 0);
  const check = (condition, points, yes, no) => { if (condition) { matchScore += points; reasons.push(yes); } else warnings.push(no); };
  check(income >= loan.minIncome, 30, 'Income meets the demo minimum', 'Income is below the demo minimum');
  check(input.age >= loan.minAge && input.age <= loan.maxAge && input.age + input.tenureYears <= loan.maxAge, 15, 'Age and age at maturity fit the demo range', 'Age or age at maturity falls outside the demo range');
  check(input.loanAmount <= loan.maxLoan && input.tenureYears <= loan.maxTenureYears, 20, 'Amount and tenure fit the demo limits', 'Amount or tenure exceeds the demo limits');
  check(credit >= loan.recommendedCreditScore, 20, 'Self-reported credit score meets the demo guideline', 'Credit score is unknown or below the demo guideline');
  check(['salaried', 'self-employed', 'business'].includes(input.employmentType), 10, 'Employment type fits the demo product', 'Employment requires further review');
  check(income > 0 && ((input.existingEmi || 0) + emi) / income <= 0.5, 5, 'Estimated total EMI is within 50% of income', 'Estimated total EMI exceeds 50% of income');
  return { ...loan, matchScore, reasons, warnings, approxMonthlyEmi: emi, potentialMatch: matchScore >= 70,
    disclaimer: 'Illustrative demo match only. Rates are not current quotations and this is not loan approval.' };
}
export function matchScheme(scheme, input) {
  let matchScore = 0; const reasons = []; const warnings = ['Demo scheme illustration; eligibility and benefits require official confirmation.'];
  if (input.age >= scheme.minAge && input.age <= scheme.maxAge) { matchScore += 30; reasons.push('Age fits the demo range'); } else warnings.push('Age outside demo range');
  const income = input.annualIncome ?? input.monthlyIncome * 12;
  if (income <= scheme.maxAnnualIncome) { matchScore += 40; reasons.push('Income fits the demo threshold'); } else warnings.push('Income exceeds demo threshold');
  if (!scheme.employmentTypes.length || scheme.employmentTypes.includes(input.employmentType)) { matchScore += 30; reasons.push('Profile fits the demo category'); } else warnings.push('Profile requires eligibility review');
  return { ...scheme, matchScore, reasons, warnings };
}
