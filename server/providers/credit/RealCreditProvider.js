import { CreditProvider } from './CreditProvider.js';
import { ProviderNotConfiguredError } from '../../utils/errors.js';

// No vendor endpoints are assumed. Implement against contracted provider documentation.
export class RealCreditProvider extends CreditProvider {
  async getCreditReport() { throw new ProviderNotConfiguredError('RealCreditProvider'); }
}
