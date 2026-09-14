import { FinancialProvider } from './FinancialProvider.js';
import { ProviderNotConfiguredError } from '../../utils/errors.js';

// No vendor endpoints are assumed. Implement against contracted provider documentation.
export class PerfiosFinancialProvider extends FinancialProvider {
  async analyzeBankStatement() { throw new ProviderNotConfiguredError('PerfiosFinancialProvider'); }
  async analyzeIncome() { throw new ProviderNotConfiguredError('PerfiosFinancialProvider'); }
  async extractFinancialSummary() { throw new ProviderNotConfiguredError('PerfiosFinancialProvider'); }
}
