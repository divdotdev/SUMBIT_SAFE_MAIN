import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { Button, Field, Notice, SafeNote } from '../components/UI';
export default function Auth({ register = false }) {
  const { authenticate, health } = useApp(); const navigate = useNavigate(); const [params] = useSearchParams();
  const next = params.get('next'); const destination = next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') && !next.startsWith('/register') ? next : '/dashboard';
  const [form, setForm] = useState({ name: '', email: '', password: '', dob: '', city: '' }); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const update = key => event => setForm({ ...form, [key]: event.target.value });
  async function submit(event, demo = false) {
    event?.preventDefault(); setBusy(true); setError('');
    try {
      const payload = demo ? { email: 'demo@submitsafe.in', password: 'Demo@123' } : { email: form.email.trim(), password: form.password };
      const result = register && !demo ? await api.register({ ...payload, name: form.name.trim(), profile: { dob: form.dob, ...(form.city ? { city: form.city.trim() } : {}) } }) : await api.login(payload);
      authenticate(result); navigate(destination, { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="auth-layout container"><aside className="auth-aside"><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>A little clarity.<br/>A lot of possibility.</h1><p>One place to find your options, prepare your documents, and move forward.</p><div className="auth-illustration"><ShieldCheck size={86} strokeWidth={1}/><span><Check size={20}/> Informed at every step</span></div><div className="auth-aside-bottom">Know before you submit.</div></aside><section className="auth-form"><div className="eyebrow">{register ? 'LET’S GET TO KNOW YOU' : 'GOOD TO SEE YOU AGAIN'}</div><h2>{register ? 'Start with confidence.' : 'Welcome back.'}</h2><p>{register ? 'Create your account. Your next step is waiting.' : 'Pick up right where you left off.'}</p><form onSubmit={submit}>
    {register && <Field label="Full name" autoComplete="name" required maxLength={120} value={form.name} onChange={update('name')} hint="Use the name shown on your documents."/>}
    <Field label="Email address" type="email" autoComplete="email" required value={form.email} onChange={update('email')}/>
    <div className="password-field"><Field label="Password" type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : 1} maxLength={72} value={form.password} onChange={update('password')} hint={register ? 'At least 8 characters.' : undefined}/><button type="button" className="icon-button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
    {register && <div className="form-grid"><Field label="Date of birth" type="date" required min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={form.dob} onChange={update('dob')} hint="Used to check your document details."/><Field label="City (optional)" autoComplete="address-level2" maxLength={120} value={form.city} onChange={update('city')}/></div>}
    {error && <Notice tone="error">{error}</Notice>}<Button type="submit" busy={busy} className="full-width" arrow>{busy ? register ? 'Creating your account…' : 'Signing you in…' : register ? 'Create account' : 'Sign in'}</Button>
    </form>{health?.appMode === 'MOCK' && !register && <><div className="or-divider"><span>just exploring?</span></div><Button variant="secondary" className="full-width" busy={busy} onClick={() => submit(null, true)}>Try the demo account <ArrowRight size={16}/></Button></>}
    <p className="auth-switch">{register ? 'Already have an account?' : 'New to SubmitSafe?'} <Link to={`${register ? '/login' : '/register'}?next=${encodeURIComponent(destination)}`}>{register ? 'Sign in' : 'Create an account'}</Link></p><SafeNote>You decide when your information is shared.</SafeNote></section></div>;
}
