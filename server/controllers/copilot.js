import { AIProvider, planSchema } from '../providers/ai/index.js';
import { buildCopilotContext, minimizeQuestion, copilotDisclaimer } from '../services/copilotContext.js';

function publicContext(context, provider) {
  return { status: context ? 'ready' : 'no_context', provider: provider.status, summary: context?.summary || null,
    contextVersion: context?.version || null, nextActions: context?.actions.slice(0, 6) || [], disclaimer: copilotDisclaimer };
}

export function renderGroundedAnswer(context, rawPlan) {
  const plan = planSchema.parse(rawPlan);
  const facts = context.modelContext.facts;
  if (plan.factIds.some(id => !facts.some(f => f.id === id))) throw new Error('Unknown grounding reference');
  let ids = plan.intent === 'next' ? context.actions.slice(0, 3).map(a => a.factId) : plan.factIds;
  if (plan.intent === 'unavailable') ids = ['limits'];
  if (plan.intent === 'readiness') ids = ['readiness', ...ids];
  if (ids.some(id => plan.intent !== 'next' && !facts.find(f => f.id === id).topics.includes(plan.intent))) throw new Error('Reference does not support intent');
  const selected = [...new Set(ids)].map(id => facts.find(f => f.id === id));
  const answer = selected.length ? `${plan.intent === 'next' ? 'Fix these in priority order:\n\n' : ''}${selected.map(f => f.text).join('\n\n')}`
    : plan.intent === 'next' ? 'No outstanding next action is recorded in the current preparation findings.'
      : 'That information is unavailable in the current application context.';
  return { answer, references: selected.map(f => context.references[f.id]) };
}

export function copilotController(store, provider = new AIProvider(), cache) {
  const load = req => buildCopilotContext(store, req.user._id, req.body, cache);
  return {
    context: async (req, res) => res.json(publicContext(await load(req), provider)),
    chat: async (req, res) => {
      const context = await load(req); const base = publicContext(context, provider);
      if (!context) return res.json({ ...base, answer: 'Select a loan type, product or application to start.', references: [] });
      if (!provider.status.available) return res.json({ ...base, status: 'unavailable', answer: 'AI Copilot is unavailable because an AI provider is not configured. The rules summary remains available.', references: [] });
      try {
        const plan = await provider.explain(context.modelContext, minimizeQuestion(req.body.message, context.privateValues));
        const rendered = renderGroundedAnswer(context, plan);
        // A profile edit or evidence replacement during a model call invalidates its answer.
        const fresh = await load(req);
        if (!fresh || fresh.version !== context.version) return res.json({ ...publicContext(fresh, provider), status: 'context_changed', answer: 'Your application context changed. Ask again to use the latest findings.', references: [] });
        return res.json({ ...base, ...rendered, status: 'success' });
      } catch {
        return res.json({ ...base, status: 'provider_error', answer: 'The AI provider could not return a grounded response. Please retry. The rules summary is still available.', references: [] });
      }
    },
  };
}
