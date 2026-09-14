import { LenderProvider } from './LenderProvider.js';
export class MockLenderProvider extends LenderProvider {
  async submitApplication() { return { dataMode: 'DEMO', status: 'Submitted', message: 'Sandbox application prepared. No application has been sent to a real lender.' }; }
}
