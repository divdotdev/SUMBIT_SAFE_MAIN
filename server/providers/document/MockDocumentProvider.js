import { DocumentProvider } from './DocumentProvider.js';
import { LocalOCRProvider } from './LocalOCRProvider.js';
export class MockDocumentProvider extends DocumentProvider {
  constructor(config) { super(); this.local = new LocalOCRProvider(config); }
  async analyzeIdentityDocument(input) { return this.local.analyzeIdentityDocument(input); }
}
