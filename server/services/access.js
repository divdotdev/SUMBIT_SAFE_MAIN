import { AppError } from '../utils/errors.js';
export async function owned(store, model, id, userId) {
  const record = await store.one(model, { _id: id, userId });
  if (!record) throw new AppError(404, 'Record not found', 'NOT_FOUND');
  return record;
}
export async function requireConsent(store, { userId, consentId, purpose, documentId, sharedWith }) {
  const consent = consentId ? await owned(store, 'Consent', consentId, userId) : null;
  if (!consent || consent.purpose !== purpose || consent.revokedAt || (documentId && !consent.documentIds.includes(documentId)) || (sharedWith && consent.sharedWith !== sharedWith)) {
    throw new AppError(403, 'An active consent for this purpose and resource is required', 'CONSENT_REQUIRED');
  }
  return consent;
}
export async function audit(store, userId, action, resourceId) {
  await store.create('AuditLog', { userId, action, resourceId, timestamp: new Date() });
}
