export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') { super(message); this.status = status; this.code = code; }
}
export class ProviderNotConfiguredError extends AppError {
  constructor(provider) { super(503, `${provider} requires an explicitly implemented and configured LIVE adapter`, 'ProviderNotConfiguredError'); this.name = 'ProviderNotConfiguredError'; }
}
