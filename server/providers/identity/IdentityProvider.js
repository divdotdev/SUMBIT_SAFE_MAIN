export class IdentityProvider {
  async verifyIdentity() { throw new Error('verifyIdentity must be implemented by an adapter'); }
  async verifyPan() { throw new Error('verifyPan must be implemented by an adapter'); }
}
