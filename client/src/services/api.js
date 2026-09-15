const BASE_URL = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api')).replace(/\/$/, '');
export const session = {
  get: () => sessionStorage.getItem('submitsafe.token'),
  set: token => sessionStorage.setItem('submitsafe.token', token),
  clear: () => sessionStorage.removeItem('submitsafe.token'),
};
export class ApiError extends Error {
  constructor(message, status = 0, code = '') { super(message); this.status = status; this.code = code; }
}
async function request(path, { method = 'GET', body, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const token = session.get();
    const multipart = body instanceof FormData;
    const response = await fetch(`${BASE_URL}${path}`, {
      method, signal: controller.signal,
      headers: { ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/')) { session.clear(); window.dispatchEvent(new Event('submitsafe:expired')); }
      const friendly = response.status === 429 ? 'A few too many requests. Please take a moment and try again.'
        : data.error?.code === 'ProviderNotConfiguredError' ? 'This service is not available yet. Please try the demo experience.'
        : response.status >= 500 ? 'We couldn’t complete this right now. Please try again in a moment.'
        : data.error?.fields?.map(field => field.message).join('. ') || data.error?.message || 'Something needs your attention. Please try again.';
      throw new ApiError(friendly, response.status, data.error?.code);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.name === 'AbortError' ? 'This is taking longer than expected. Please try again.' : 'We can’t reach SubmitSafe right now. Check your connection and try again.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export const api = {
  adminMetrics: () => request('/admin/metrics'),
  adminRecords: section => request('/admin/' + section),
  saveCatalog: (section, id, body) => request('/admin/' + section + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body }),
  updateAgentAdmin: (id, body, isRequest) => request('/admin/' + (isRequest ? 'agent-requests' : 'agents') + '/' + id, { method:'PATCH', body }),
  partnerLeads: () => request('/partner/leads'),
  partnerLead: id => request('/partner/leads/' + id),
  updateLead: (id, body) => request('/partner/leads/' + id, { method:'PATCH', body }),
  copilotContext: body => request('/copilot/context', { method: 'POST', body }),
  copilotChat: body => request('/copilot/chat', { method: 'POST', body }),
  health: () => request('/health'),
  login: body => request('/auth/login', { method: 'POST', body }),
  register: body => request('/auth/register', { method: 'POST', body }),
  updateProfile: body => request('/user/me', { method: 'PATCH', body }),
  me: () => request('/user/me'),
  sendOtp: phone => request('/auth/send-otp', { method: 'POST', body: { phone } }),
  verifyOtp: body => request('/auth/verify-otp', { method: 'POST', body }),
  loans: (loanType = 'HOME') => request(`/loans?loanType=${loanType}`), loan: id => request(`/loans/${id}`),
  matchLoans: body => request('/loans/match', { method: 'POST', body }),
  compareLoans: (loanProductIds, profile) => request('/loans/compare', { method: 'POST', body: { loanProductIds, profile } }),
  documents: () => request('/documents'), readiness: (context = {}) => request(`/documents/readiness?${new URLSearchParams(Object.entries(context).filter(([, value]) => value))}`),
  document: id => request(`/documents/${id}`),
  upload: (file, documentType) => { const body = new FormData(); body.append('file', file); body.append('documentType', documentType); return request('/documents/upload', { method: 'POST', body }); },
  analyze: (id, consentId) => request(`/documents/${id}/analyze`, { method: 'POST', body: { consentId } }),
  consents: () => request('/consents'), consent: body => request('/consents', { method: 'POST', body }),
  revokeConsent: id => request(`/consents/${id}/revoke`, { method: 'PATCH' }),
  applications: () => request('/applications'), application: id => request(`/applications/${id}`),
  createApplication: body => request('/applications', { method: 'POST', body }),
  applicationStatus: (id, status, consentId) => request(`/applications/${id}/status`, { method: 'PATCH', body: { status, ...(consentId ? { consentId } : {}) } }),
  schemes: () => request('/schemes'), scheme: id => request(`/schemes/${id}`),
  matchSchemes: body => request('/schemes/match', { method: 'POST', body }),
  agents: () => request('/agents'), agent: id => request(`/agents/${id}`),
  requestAgent: (id, consentId, context = {}) => request(`/agents/${id}/request`, { method: 'POST', body: { consentId, ...context } }),
};
