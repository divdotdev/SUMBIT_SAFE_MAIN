import { CreditProvider } from './CreditProvider.js';
export class MockCreditProvider extends CreditProvider {
  async getCreditReport() { return { dataMode: 'DEMO', creditScore: null, status: 'unavailable', disclaimer: 'No credit bureau was contacted.' }; }
}
