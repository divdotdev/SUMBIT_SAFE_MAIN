import { IdentityProvider } from './IdentityProvider.js';
export class MockIdentityProvider extends IdentityProvider {
  async verifyIdentity() { return { dataMode: 'DEMO', verificationMode: 'SANDBOX_DOCUMENT_CHECK', status: 'manual_review', verified: false, disclaimer: 'Mock readiness response; no identity authentication was performed.' }; }
  async verifyPan() { return { dataMode: 'DEMO', verificationMode: 'SANDBOX_DOCUMENT_CHECK', status: 'manual_review', verified: false, disclaimer: 'Mock readiness response; no identity authentication was performed.' }; }
}
