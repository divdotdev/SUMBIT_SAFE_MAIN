// Presentation fixtures use synthetic parser examples, never issued credentials. PAN is masked in every result.
export const rahulProfile = { name:'Rahul Sharma', age:28, city:'Chandigarh', employmentType:'salaried', monthlyIncome:70000, annualIncome:840000, existingEmi:5000, loanAmount:2500000, loanType:'HOME', tenureYears:20, creditScoreRange:'750-799' };
export const homeDocumentLines = {
  AADHAAR:['SYNTHETIC DEMO - NOT VALID ID', 'Aadhaar', 'Government of India identity format illustration', 'Name: Rahul Sharma', 'DOB: 15/06/1998', 'XXXX XXXX 4821'],
  PAN:['SYNTHETIC DEMO - NOT VALID ID', 'Income Tax Department format illustration', 'Permanent Account Number', 'Name: Rahul Sharma', 'DOB: 15/06/1998', 'ABCDE1234F'],
  SALARY_SLIP:['SYNTHETIC DEMO - NOT VALID INCOME PROOF', 'Salary Slip', 'Employee: Rahul Sharma', 'Employer: Fictional Demo Company', 'Month: August 2026', 'Gross Salary: INR 70000', 'Net Salary: INR 65000'],
  BANK_STATEMENT:['SYNTHETIC DEMO - NOT A BANK RECORD', 'Fictional Demo Bank', 'Account Statement', 'Account Holder: Rahul Sharma', 'Statement Period: 01/06/2026 to 31/08/2026', 'Opening Balance: INR 120000', 'Closing Balance: INR 150000'],
};
