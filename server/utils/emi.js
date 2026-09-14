export function calculateEmi(principal, annualRate, tenureYears) {
  if (![principal, annualRate, tenureYears].every(Number.isFinite) || principal <= 0 || annualRate < 0 || tenureYears <= 0) throw new RangeError('Invalid EMI inputs');
  const months = Math.round(tenureYears * 12);
  if (months < 1) throw new RangeError('Tenure must be at least one month');
  const rate = annualRate / 1200;
  return Math.round((rate === 0 ? principal / months : principal * rate / (1 - Math.pow(1 + rate, -months))) * 100) / 100;
}
