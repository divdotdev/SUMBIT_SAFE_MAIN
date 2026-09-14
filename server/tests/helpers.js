// Tiny searchable PDF fixture; offsets are calculated in bytes, including the xref table.
export function pdf(lines) {
  const content = `BT /F1 12 Tf 50 750 Td ${lines.map((line, i) => `${i ? '0 -20 Td ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`).join('\n')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
  let result = '%PDF-1.4\n'; const offsets = [0];
  for (const [i, obj] of objects.entries()) { offsets.push(Buffer.byteLength(result)); result += `${i + 1} 0 obj\n${obj}\nendobj\n`; }
  const start = Buffer.byteLength(result);
  result += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(result);
}
export const sampleProfile = { name: 'Test Person', age: 30, city: 'Delhi', employmentType: 'salaried', monthlyIncome: 100000, existingEmi: 0, loanAmount: 3000000, tenureYears: 20, creditScoreRange: '750-799' };
export const documentLines = {
  AADHAAR: ['Government of India', 'Unique Identification Authority', 'Name: Test Person', 'DOB: 01/01/1995', 'Male', '1234 5678 9012'],
  PAN: ['Income Tax Department', 'Permanent Account Number', 'Name: Test Person', 'DOB: 01/01/1995', 'ABCDE1234F'],
  SALARY_SLIP: ['Salary Slip', 'Employee: Test Person', 'Employer: Demo Company', 'Month: March 2026', 'Gross Salary: INR 100000', 'Net Salary: INR 85000'],
  BANK_STATEMENT: ['Demo Bank', 'Account Statement', 'Account Holder: Test Person', 'Statement Period: 01/01/2026 to 31/03/2026', 'Opening Balance: INR 100000', 'Closing Balance: INR 150000'],
};
