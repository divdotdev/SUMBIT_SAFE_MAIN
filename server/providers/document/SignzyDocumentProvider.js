import { DocumentProvider } from './DocumentProvider.js';
import { ProviderNotConfiguredError } from '../../utils/errors.js';

// No vendor endpoints are assumed. Implement against contracted provider documentation.
export class SignzyDocumentProvider extends DocumentProvider {
  async analyzeIdentityDocument() { throw new ProviderNotConfiguredError('SignzyDocumentProvider'); }
}
