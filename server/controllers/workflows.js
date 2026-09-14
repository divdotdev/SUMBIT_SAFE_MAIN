import { randomInt } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { audit, owned, requireConsent } from '../services/access.js';
import { overallReadiness } from '../services/documentAnalysis.js';
const sandboxMessage = 'Sandbox application prepared. No application has been sent to a real lender.';
const transitions = { Draft: ['Documents Pending', 'Ready'], 'Documents Pending': ['Draft', 'Ready'], Ready: ['Documents Pending', 'Submitted'], Submitted: ['Under Review'], 'Under Review': ['Completed'], Completed: [] };
export function workflowsController(store, config, providers) {
  return {
    consent: async (req, res) => {
      for (const documentId of req.body.documentIds) await owned(store, 'Document', documentId, req.user._id);
      const consent = await store.create('Consent', { ...req.body, userId: req.user._id, timestamp: new Date(), revokedAt: null });
      await audit(store, req.user._id, 'CONSENT_GIVEN', consent._id);
      res.status(201).json({ consent });
    },
    consents: async (req, res) => res.json({ data: await store.find('Consent', { userId: req.user._id }) }),
    revokeConsent: async (req, res) => {
      const consent = await owned(store, 'Consent', req.params.id, req.user._id);
      res.json({ consent: consent.revokedAt ? consent : await store.update('Consent', consent._id, { revokedAt: new Date() }) });
      await audit(store, req.user._id, 'CONSENT_REVOKED', consent._id);
    },
    createApplication: async (req, res) => {
      const loan = await store.one('LoanProduct', { _id: req.body.loanProductId });
      if (!loan) throw new AppError(404, 'Loan product not found', 'NOT_FOUND');
      if (req.body.loanType !== loan.loanType) throw new AppError(400, 'loanType must match the selected product');
      if (req.body.loanAmount > loan.maxLoan || req.body.tenure > loan.maxTenureYears) throw new AppError(400, 'Amount or tenure exceeds product limits');
      if (req.body.consentId) await requireConsent(store, { userId: req.user._id, consentId: req.body.consentId, purpose: 'LENDER_DATA_SHARE', sharedWith: loan._id });
      const readiness = await overallReadiness(store, req.user._id);
      let application;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          application = await store.create('LoanApplication', { ...req.body, userId: req.user._id, status: 'Draft', readinessScore: readiness.overallScore,
            applicationCode: `SS-HOME-${new Date().getFullYear()}-${randomInt(10000, 100000)}`, dataMode: loan.dataMode });
          break;
        } catch (error) { if (error.code !== 11000 && error.code !== 'CONFLICT') throw error; }
      }
      if (!application) throw new AppError(503, 'Could not allocate an application code; retry');
      await audit(store, req.user._id, 'APPLICATION_CREATED', application._id);
      res.status(201).json({ application, message: config.appMode === 'MOCK' ? sandboxMessage : 'Application draft saved.' });
    },
    applications: async (req, res) => res.json({ data: await store.find('LoanApplication', { userId: req.user._id }) }),
    application: async (req, res) => res.json({ application: await owned(store, 'LoanApplication', req.params.id, req.user._id) }),
    applicationStatus: async (req, res) => {
      const application = await owned(store, 'LoanApplication', req.params.id, req.user._id);
      const status = req.body.status;
      if (!transitions[application.status].includes(status)) throw new AppError(409, 'Invalid application status transition', 'INVALID_TRANSITION');
      if (config.appMode === 'LIVE' && ['Under Review', 'Completed'].includes(status) && req.user.role !== 'admin') throw new AppError(403, 'Only an authorized lender workflow can update this status');
      const readiness = await overallReadiness(store, req.user._id);
      if (['Ready', 'Submitted'].includes(status) && readiness.status !== 'Ready') throw new AppError(409, 'Complete document readiness checks first', 'DOCUMENTS_NOT_READY');
      const consentId = req.body.consentId || application.consentId;
      if (status === 'Submitted') {
        await requireConsent(store, { userId: req.user._id, consentId, purpose: 'LENDER_DATA_SHARE', sharedWith: application.loanProductId });
        await providers.lender.submitApplication({ application, consentId });
      }
      const updated = await store.update('LoanApplication', application._id, { status, readinessScore: readiness.overallScore, ...(consentId ? { consentId } : {}) });
      await audit(store, req.user._id, 'APPLICATION_STATUS_CHANGED', application._id);
      res.json({ application: updated, message: config.appMode === 'MOCK' ? sandboxMessage : 'Application status updated.' });
    },
    requestAgent: async (req, res) => {
      const agent = await store.one('Agent', { _id: req.params.id });
      if (!agent) throw new AppError(404, 'Agent not found', 'NOT_FOUND');
      await requireConsent(store, { userId: req.user._id, consentId: req.body.consentId, purpose: 'AGENT_ASSISTANCE', sharedWith: agent._id });
      const request = await store.create('AgentRequest', { userId: req.user._id, agentId: agent._id, consentId: req.body.consentId, status: 'Requested', dataMode: config.appMode === 'MOCK' ? 'DEMO' : 'LIVE' });
      await audit(store, req.user._id, 'AGENT_REQUESTED', request._id);
      res.status(201).json({ request, message: config.appMode === 'MOCK' ? 'Sandbox assistance request saved. No agent has been contacted.' : 'Assistance request saved; dispatch is pending.' });
    },
  };
}
