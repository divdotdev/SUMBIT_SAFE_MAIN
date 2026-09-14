import { FinancialProvider } from './FinancialProvider.js';
export class MockFinancialProvider extends FinancialProvider {
  async analyzeBankStatement() { return { dataMode: 'DEMO', status: 'manual_review', summary: null, warnings: ['Mock provider: no financial verification or underwriting was performed.'] }; }
  async analyzeIncome() { return { dataMode: 'DEMO', status: 'manual_review', summary: null, warnings: ['Mock provider: no financial verification or underwriting was performed.'] }; }
  async extractFinancialSummary() { return { dataMode: 'DEMO', status: 'manual_review', summary: null, warnings: ['Mock provider: no financial verification or underwriting was performed.'] }; }
}
