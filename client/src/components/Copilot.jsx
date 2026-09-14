import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X, Send, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function Copilot() {
  const { user, selectedLoan, loanProfile, compareIds, schemeProfile } = useApp();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false); const [context, setContext] = useState(null);
  const [message, setMessage] = useState(''); const [reply, setReply] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0); const closeButton = useRef(null); const entry = useRef(null); const responseView = useRef(null);
  const applicationId = pathname.match(/^\/applications\/([a-f\d]{24})$/)?.[1];
  const routeProduct = pathname.match(/^\/loans\/([a-f\d]{24})(?:\/|$)/)?.[1];
  const schemeId = pathname.match(/^\/schemes\/([a-f\d]{24})$/)?.[1];
  const productId = routeProduct || (pathname.startsWith('/documents') ? selectedLoan : null);
  const loanType = pathname.startsWith('/loans/education') ? 'EDUCATION' : pathname.startsWith('/loans/home') ? 'HOME' : pathname.startsWith('/schemes') ? schemeProfile ? schemeProfile.loanType || 'HOME' : undefined : loanProfile?.loanType;
  const selection = applicationId ? { applicationId } : { ...(productId ? { productId } : loanType ? { loanType } : {}), ...(schemeId ? { schemeId } : {}), ...(pathname === '/loans/compare' && compareIds.length >= 2 ? { comparisonProductIds: compareIds.slice(0, 3) } : {}) };
  const key = JSON.stringify([selection, user?._id, user?.updatedAt, pathname]);
  const selectionJson = JSON.stringify(selection);
  const visible = /^\/(loans|documents|applications|schemes)(\/|$)/.test(pathname);
  useEffect(() => {
    const current = ++generation.current;
    setReply(null); setError(''); setMessage(''); setContext(null); setBusy(false);
    if (!open || !user || !visible) return;
    setBusy(true);
    api.copilotContext(JSON.parse(selectionJson)).then(data => { if (current === generation.current) setContext(data); })
      .catch(e => { if (current === generation.current) setError(e.message); })
      .finally(() => { if (current === generation.current) setBusy(false); });
    return () => { generation.current++; };
  }, [open, key, visible]);
  useEffect(() => { if (open) closeButton.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = event => { if (event.key === 'Escape') { setOpen(false); entry.current?.focus(); } };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [open]);
  useEffect(() => { if (reply) responseView.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [reply]);
  function close() { setOpen(false); entry.current?.focus(); }
  async function refresh() {
    const current = ++generation.current; setBusy(true); setReply(null); setError('');
    try { const data = await api.copilotContext(selection); if (current === generation.current) setContext(data); }
    catch (e) { if (current === generation.current) setError(e.message); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function ask(question) {
    if (busy || !question.trim()) return;
    const current = ++generation.current; setBusy(true); setError(''); setReply(null); setMessage(question);
    try { const data = await api.copilotChat({ ...selection, message: question }); if (current === generation.current) { setReply(data); setContext(data); } }
    catch (e) { if (current === generation.current) setError(e.message); }
    finally { if (current === generation.current) setBusy(false); }
  }
  if (!visible) return null;
  const prompts = ['Why am I not ready?', 'What should I fix next?', 'What information conflicts?', 'Which requirements are satisfied?', 'Which evidence is unverified?', 'Why does this loan match me?', 'Compare my top options.'];
  return <>
    <button ref={entry} className="copilot-entry" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="copilot-panel"><Sparkles size={18}/> Copilot</button>
    {open && <aside id="copilot-panel" className="copilot-panel" aria-label="SUBMIT-SAFE Copilot">
      <header><div><span className="eyebrow">Your application, explained</span><h2>SUBMIT-SAFE Copilot</h2></div><button ref={closeButton} className="icon-button" aria-label="Close Copilot" onClick={close}><X/></button></header>
      <div className="copilot-body">
        {!user ? <p><Link to="/login">Sign in</Link> to use your application context.</p> : <>
          {context?.provider && <p className="copilot-mode">{context.provider.mode === 'MOCK' ? 'DEMO/MOCK — deterministic demo; no model called.' : context.provider.available ? 'AI selects relevant facts; application rules control the answer.' : 'AI unavailable — no configured provider. Rules summary is available.'}</p>}
          {context?.summary && <section className="copilot-summary" aria-label="Rules summary"><strong>{context.summary.productName || `${context.summary.loanType} preparation`}</strong><p>{context.summary.state}</p><div className="copilot-counts"><span>{context.summary.blockers} blockers</span><span>{context.summary.review} review items</span><span>{context.summary.satisfied} requirements satisfied</span><span>{context.summary.unverified} unverified evidence</span></div>{context.nextActions?.[0] && <p><b>First rules-based action:</b> {context.nextActions[0].text}</p>}<button className="copilot-refresh" onClick={refresh} disabled={busy}><RefreshCw size={14}/> Refresh current findings</button></section>}
          {context?.status === 'no_context' && <p>Select a loan type, product or application to start.</p>}
          <div className="copilot-prompts">{prompts.map(prompt => <button key={prompt} disabled={busy || !context?.summary || !context?.provider?.available} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
          <div ref={responseView} aria-live="polite" aria-busy={busy}>
            {busy && <p role="status">Reading your current application…</p>}
            {error && <p role="alert">{error} <button onClick={refresh}>Retry</button></p>}
            {reply && <section className="copilot-answer" aria-label="Copilot response"><strong>{reply.status === 'success' ? 'Grounded explanation' : reply.status === 'provider_error' ? 'Provider error' : 'Context notice'}</strong><p>{reply.answer}</p>{reply.references?.length > 0 && <nav aria-label="Answer references">{reply.references.map(ref => <span key={ref.id}>{ref.href ? <Link to={ref.href}>{ref.label}</Link> : ref.label}{ref.sourceUrl && <> · <a href={ref.sourceUrl} target="_blank" rel="noreferrer">Configured source</a></>}</span>)}</nav>}</section>}
          </div>
          <form onSubmit={e => { e.preventDefault(); ask(message); }}><label htmlFor="copilot-question">Ask about this application</label><textarea id="copilot-question" maxLength={1200} value={message} onChange={e => setMessage(e.target.value)} placeholder="What should I fix first?" disabled={busy || !context?.summary || !context?.provider?.available}/><button className="button button-primary" disabled={busy || !message.trim() || !context?.summary || !context?.provider?.available}><Send size={15}/> Ask Copilot</button></form>
          <p className="copilot-note">Avoid personal identifiers in your question. Only minimized application facts are shared with the configured AI provider. {context?.disclaimer}</p>
        </>}
      </div>
    </aside>}
  </>;
}
