import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X, Send, RefreshCw, Mic, Square } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { useSarthiVoice } from '../hooks/useSarthiVoice';

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
  const voice=useSarthiVoice({enabled:open && !!user && visible,contextKey:key,onText:setMessage,onQuestion:question=>ask(question)});
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
    catch (e) { if (current === generation.current) setError("Submit Sarthi couldn't generate an answer right now. Please try again."); }
    finally { if (current === generation.current) setBusy(false); }
  }
  if (!visible) return null;
  const prompts = ['Why am I not ready?', 'What should I fix next?', 'What information conflicts?', 'Which requirements are satisfied?', 'Which evidence is unverified?', 'Why does this loan match me?', 'Compare my top options.'];
  return <>
    <button ref={entry} className="copilot-entry" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="copilot-panel"><Sparkles size={18}/> SUBMIT SARTHI</button>
    {open && <aside id="copilot-panel" className="copilot-panel" aria-label="SUBMIT SARTHI">
      <header><div><span className="eyebrow">Your application, explained</span><h2>SUBMIT SARTHI</h2></div><button ref={closeButton} className="icon-button" aria-label="Close Submit Sarthi" onClick={close}><X/></button></header>
      <div className="copilot-body">
        {!user ? <p><Link to="/login">Sign in</Link> to use your application context.</p> : <>
          {context?.provider && <p className="copilot-mode">{context.provider.mode === 'MOCK' ? 'DEMO/MOCK — deterministic demo; no model called.' : context.provider.available ? 'Submit Sarthi interprets free-form questions using your current application facts.' : 'AI unavailable — no configured provider. Rules summary is available.'}</p>}
          {context?.summary && <section className="copilot-summary" aria-label="Rules summary"><strong>{context.summary.productName || `${context.summary.loanType} preparation`}</strong><p>{context.summary.state}</p><div className="copilot-counts"><span>{context.summary.blockers} blockers</span><span>{context.summary.review} review items</span><span>{context.summary.satisfied} requirements satisfied</span><span>{context.summary.unverified} unverified evidence</span></div>{context.nextActions?.[0] && <p><b>First rules-based action:</b> {context.nextActions[0].text}</p>}<button className="copilot-refresh" onClick={refresh} disabled={busy}><RefreshCw size={14}/> Refresh current findings</button></section>}
          {context?.status === 'no_context' && <p>Select a loan type, product or application to start.</p>}
          <div className="copilot-prompts">{prompts.map(prompt => <button key={prompt} disabled={busy || voice.listening || !context?.provider?.available} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
          <div ref={responseView} aria-live="polite" aria-busy={busy}>
            {busy && <p role="status">Submit Sarthi is thinking...</p>}
            {error && <p role="alert">{error} <button onClick={()=>message.trim()?ask(message):refresh()}>Retry</button></p>}
            {reply && <section className="copilot-answer" aria-label="Submit Sarthi response"><strong>{reply.status === 'success' ? 'Grounded explanation' : reply.status === 'provider_error' ? 'Provider error' : 'Context notice'}</strong><p>{reply.answer}</p>{reply.recommendedNextStep&&<p><b>{reply.language==='hi'?'अगला कदम':reply.language==='hinglish'?'Agla recommended step':'Recommended next step'}:</b><br/>{reply.recommendedNextStep}</p>}{reply.status==='provider_error'&&<button disabled={busy} onClick={()=>ask(message)}>Try question again</button>}{reply.suggestions?.length>0&&<div className="copilot-prompts" aria-label="Suggested follow-up questions">{reply.suggestions.slice(0,3).map(question=><button key={question} disabled={busy || voice.listening} onClick={()=>ask(question)}>{question}</button>)}</div>}{reply.references?.length > 0 && <nav aria-label="Answer references">{reply.references.map(ref => <span key={ref.id}>{ref.href ? <Link to={ref.href}>{ref.label}</Link> : ref.label}{ref.sourceUrl && <> · <a href={ref.sourceUrl} target="_blank" rel="noreferrer">Configured source</a></>}</span>)}</nav>}</section>}
          </div>
          <form onSubmit={e => { e.preventDefault(); ask(message); }}><label htmlFor="copilot-question">Ask about this application</label><textarea id="copilot-question" maxLength={1200} value={message} onChange={e => setMessage(e.target.value)} placeholder="What should I fix first?" disabled={busy || voice.listening || !context?.provider?.available}/><div className="sarthi-voice"><label htmlFor="sarthi-language">Voice language</label><select id="sarthi-language" value={voice.language} disabled={voice.listening || busy} onChange={e=>voice.setLanguage(e.target.value)}><option value="en-IN">English</option><option value="hi-IN">हिंदी</option></select><button type="button" className="icon-button" aria-label={voice.listening?'Stop listening':'Start voice input'} aria-pressed={voice.listening} disabled={busy || !context?.provider?.available || !voice.supported} onClick={voice.listening?voice.stop:voice.start}>{voice.listening?<Square size={18}/>:<Mic size={18}/>}</button></div>{voice.listening&&<p role="status">Listening...</p>}{(!voice.supported || voice.notice)&&<p role="status">{voice.notice || 'Voice input is not supported in this browser. You can still type your question.'}</p>}<button className="button button-primary" disabled={busy || voice.listening || !message.trim() || !context?.provider?.available}><Send size={15}/> Ask Submit Sarthi</button></form>
          <p className="copilot-note">Voice uses your browser’s speech service; audio may be processed by its provider. Avoid personal identifiers in your question. Only minimized application facts are shared with the configured AI provider. {context?.disclaimer}</p>
        </>}
      </div>
    </aside>}
  </>;
}
