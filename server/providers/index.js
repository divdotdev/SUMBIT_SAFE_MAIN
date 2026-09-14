import { MockDocumentProvider } from './document/MockDocumentProvider.js';
import { SignzyDocumentProvider } from './document/SignzyDocumentProvider.js';
import { MockIdentityProvider } from './identity/MockIdentityProvider.js';
import { SignzyIdentityProvider } from './identity/SignzyIdentityProvider.js';
import { MockFinancialProvider } from './financial/MockFinancialProvider.js';
import { PerfiosFinancialProvider } from './financial/PerfiosFinancialProvider.js';
import { MockCreditProvider } from './credit/MockCreditProvider.js';
import { RealCreditProvider } from './credit/RealCreditProvider.js';
import { MockLenderProvider } from './lender/MockLenderProvider.js';
import { PartnerLenderProvider } from './lender/PartnerLenderProvider.js';
import { createAIProvider } from './ai/index.js';
export function createProviders(config) {
  const mock = config.appMode === 'MOCK';
  return { ai: createAIProvider(config.ai), document: mock ? new MockDocumentProvider(config) : new SignzyDocumentProvider(),
    identity: mock ? new MockIdentityProvider() : new SignzyIdentityProvider(),
    financial: mock ? new MockFinancialProvider() : new PerfiosFinancialProvider(),
    credit: mock ? new MockCreditProvider() : new RealCreditProvider(),
    lender: mock ? new MockLenderProvider() : new PartnerLenderProvider() };
}
