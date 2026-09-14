import { LenderProvider } from './LenderProvider.js';
import { ProviderNotConfiguredError } from '../../utils/errors.js';

// No vendor endpoints are assumed. Implement against contracted provider documentation.
export class PartnerLenderProvider extends LenderProvider {
  async submitApplication() { throw new ProviderNotConfiguredError('PartnerLenderProvider'); }
}
