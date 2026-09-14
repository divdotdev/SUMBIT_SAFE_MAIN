export class FinancialProvider {
  async analyzeBankStatement() { throw new Error('analyzeBankStatement must be implemented by an adapter'); }
  async analyzeIncome() { throw new Error('analyzeIncome must be implemented by an adapter'); }
  async extractFinancialSummary() { throw new Error('extractFinancialSummary must be implemented by an adapter'); }
}
