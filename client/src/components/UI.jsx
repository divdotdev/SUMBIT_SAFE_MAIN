import { useEffect, useRef, useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, AlertCircle, LoaderCircle, ShieldCheck, X, FileText, CircleHelp, ChevronRight } from 'lucide-react';
export const money = value => value == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not provided';
export const docNames = { AADHAAR: 'Aadhaar', PAN: 'PAN card', SALARY_SLIP: 'Salary slip', BANK_STATEMENT: 'Bank statement', DRIVING_LICENCE: 'Driving Licence', ADMISSION_LETTER: 'Admission letter', FEE_SCHEDULE: 'Fee schedule' };
export const occupations = [['salaried', 'Salaried'], ['self-employed', 'Self-employed'], ['business', 'Business owner'], ['student', 'Student'], ['farmer', 'Farmer'], ['unemployed', 'Not currently working'], ['other', 'Other']];
export function Button({ to, children, variant = 'primary', busy, disabled, className = '', arrow = false, ...props }) {
  const classes = `button button-${variant} ${className}`;
  if (to) return <Link to={to} className={classes} {...props}>{children}{arrow && <ArrowRight size={17}/>}</Link>;
  return <button type="button" className={classes} {...props} disabled={busy || disabled}>{busy && <LoaderCircle className="spin" size={17}/>} {children}{arrow && <ArrowRight size={17}/>}</button>;
}
export function Field({ label, hint, prefix, ...props }) { const generated=useId(); const id=props.id||generated; return <div className="field"><label htmlFor={id}>{label}</label><div className={prefix ? 'input-wrap with-prefix' : 'input-wrap'}>{prefix && <span className="input-prefix" aria-hidden="true">{prefix}</span>}<input {...props} id={id} aria-describedby={hint?`${id}-hint`:undefined}/></div>{hint && <small id={`${id}-hint`}>{hint}</small>}</div>; }
export function Select({ label, children, ...props }) { const generated=useId();const id=props.id||generated;return <div className="field"><label htmlFor={id}>{label}</label><select {...props} id={id}>{children}</select></div>; }
export function Badge({ children, tone = 'neutral' }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Ring({ value = 0, label = 'Readiness', size = 100 }) { const score = Math.max(0, Math.min(100, value)); return <div className="ring" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ring-track" cx="50" cy="50" r="43"/><circle className="ring-fill" cx="50" cy="50" r="43" strokeDasharray={`${score * 2.702} 270.2`}/></svg><strong>{score}<span>%</span></strong></div>; }
export function Loading({ label = 'Getting things ready…' }) { return <div className="loading" role="status"><LoaderCircle size={26} className="spin"/><p>{label}</p><div className="skeleton"/><div className="skeleton short"/></div>; }
export function Notice({ children, tone = 'info' }) { return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : undefined}><AlertCircle size={18}/><div>{children}</div></div>; }
export function Problem({ error, retry }) { return <div className="empty-state"><AlertCircle size={32}/><h2>Let’s try that again.</h2><p>{error?.message || 'We couldn’t load this page right now.'}</p>{retry && <Button onClick={retry}>Try again</Button>}</div>; }
export function Empty({ title, children, to, action = 'Get started', icon: Icon = FileText }) { return <div className="empty-state"><div className="icon-tile"><Icon size={28}/></div><h2>{title}</h2><p>{children}</p>{to && <Button to={to} arrow>{action}</Button>}</div>; }
export function PageHeading({ eyebrow, title, children, action, back }) { return <header className="page-heading">{back && <Link className="back-link" to={back}><ArrowLeft size={16}/> Back</Link>}<div className="heading-row"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 tabIndex={-1}>{title}</h1>{children && <p>{children}</p>}</div>{action}</div></header>; }
export function Steps({ current, labels }) { return <ol className="steps" aria-label="Your progress">{labels.map((label, index) => <li key={label} className={index < current ? 'complete' : index === current ? 'active' : ''} aria-current={index === current ? 'step' : undefined}><span>{index < current ? <Check size={15}/> : index + 1}</span><small>{label}</small></li>)}</ol>; }
export function CheckList({ items }) { return <ul className="check-list">{items.map(item => <li key={item}><Check size={16}/><span>{item}</span></li>)}</ul>; }
export function SafeNote({ children = 'Your information stays in your control.' }) { return <p className="safe-note"><ShieldCheck size={15}/>{children}</p>; }
export function Modal({ open, title, children, onClose }) {
  const ref = useRef();
  useEffect(() => { if (open && !ref.current.open) ref.current.showModal(); else if (!open && ref.current.open) ref.current.close(); }, [open]);
  return <dialog ref={ref} className="modal" onCancel={onClose} aria-labelledby="modal-title"><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={20}/></button><h2 id="modal-title">{title}</h2>{children}</dialog>;
}
export function DetailRow({ label, children }) { return <div className="detail-row"><span>{label}</span><strong>{children}</strong></div>; }
export function SectionLink({ to, icon: Icon = FileText, title, children }) { return <Link to={to} className="section-link"><div className="icon-tile"><Icon size={21}/></div><div><strong>{title}</strong><p>{children}</p></div><ChevronRight size={20}/></Link>; }
export function GovernmentNote() { return <p className="government-note"><CircleHelp size={16}/>SubmitSafe is an independent platform and is not a Government of India website.</p>; }
