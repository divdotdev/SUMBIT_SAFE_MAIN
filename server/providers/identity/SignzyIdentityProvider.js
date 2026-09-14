import { IdentityProvider } from './IdentityProvider.js';
import { ProviderNotConfiguredError } from '../../utils/errors.js';

// No vendor endpoints are assumed. Implement against contracted provider documentation.
export class SignzyIdentityProvider extends IdentityProvider {
  async verifyIdentity() { throw new ProviderNotConfiguredError('SignzyIdentityProvider'); }
  async verifyPan() { throw new ProviderNotConfiguredError('SignzyIdentityProvider'); }
}
