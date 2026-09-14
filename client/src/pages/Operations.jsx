import { useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { Badge, Button, DetailRow, Empty, Field, Loading, Modal, Notice, PageHeading, Problem, Select, date, money } from '../components/UI';

const adminSections = ['users','applications','documents','loans','schemes','agents','consents','audit'];
const title = value => value.replaceAll('-', ' ').replace(/^./, c=>c.toUpperCase());
const healthLabel = status => ({passed:'Ready',warning:'Needs Attention',failed:'Failed check',manual_review:'Manual Review',uploaded:'Not checked'})[status] || status;
export function OperationsLayout({ role }) {
  const { user, health } = useApp();
  if (user.role !== role) return <Empty title="This area needs a different account." to="/profile" action="Manage sign-in">Sign in with your assigned {role} account. Your applicant account cannot access these records.</Empty>;
  if (role==='partner' && health?.appMode !== 'MOCK') return <Empty title="The partner portal is available in MOCK mode."/>;
  return <div className="container page operations"><PageHeading eyebrow={role==='partner'?'DEMO PARTNER PORTAL':'SUBMITSAFE OPERATIONS'} title={role==='partner'?'Prepared applicants. Clearer next steps.':'Your workspace, at a glance.'}>{role==='partner'?'Pre-screened for application readiness — not credit-approved.':'Manage configured records and review activity from this database.'}</PageHeading><nav className="operations-nav" aria-label={`${title(role)} navigation`}><NavLink end to={`/${role}`}>Overview</NavLink>{(role==='admin'?adminSections:['leads']).map(section=><NavLink key={section} to={`/${role}/${section}`}>{title(section)}</NavLink>)}<Button to="/profile" variant="text">Switch account</Button></nav><Outlet/></div>;
}
function Stats({ metrics }) {
  return <div className="operations-stats">{Object.entries(metrics).map(([label,value])=><article className="card metric" key={label}><span>{label}</span><strong>{value==null?'—':`${value}${/Readiness|Rate/.test(label)?'%':''}`}</strong></article>)}</div>;
}
export function RecordsTable({ columns, rows, empty='No records yet.' }) {
  if (!rows.length) return <Empty title={empty}>Records will appear as you use the demo workflows.</Empty>;
  return <div className="records-scroll" tabIndex={0} role="region" aria-label="Scrollable records"><table className="records-table"><thead><tr>{columns.map(([label])=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={row._id || index}>{columns.map(([label,render])=><td key={label}>{render(row) ?? '—'}</td>)}</tr>)}</tbody></table></div>;
}
function Gate({ resource, children }) {
  if (resource.loading) return <Loading/>;
  if (resource.error) return <Problem error={resource.error} retry={resource.reload}/>;
  return children(resource.data);
}
export function AdminOverview() {
  const resource=useResource('admin-metrics',api.adminMetrics);
  return <Gate resource={resource}>{data=><><Badge>{data.dataMode==='DEMO'?'DEMO METRICS':'DATABASE METRICS'}</Badge><Stats metrics={data.metrics}/><Notice>{data.explanation}</Notice></>}</Gate>;
}
const columns = {
  users:[['Name',r=>r.name],['Email',r=>r.email],['Role',r=>r.role],['Created',r=>date(r.createdAt)]],
  applications:[['Application',r=>r.applicationCode],['Applicant ID',r=>r.userId],['Loan',r=>r.loanType],['Amount',r=>money(r.loanAmount)],['Status',r=>r.status],['Partner stage',r=>r.partnerStage || 'New'],['Readiness at update',r=>`${r.readinessScore ?? 0}%`]],
  documents:[['Applicant ID',r=>r.userId],['Document',r=>r.documentType],['Check',r=>healthLabel(r.status)],['Readiness',r=>r.readinessScore==null?'Not checked':`${r.readinessScore}%`],['Source',r=>r.sourceVerification],['Uploaded',r=>date(r.createdAt)]],
  consents:[['Applicant ID',r=>r.userId],['Purpose',r=>r.purpose],['Shared with',r=>r.sharedWith],['Documents',r=>r.documentIds.length],['State',r=>r.revokedAt?'Revoked':'Active'],['Given',r=>date(r.timestamp)]],
  audit:[['Action',r=>r.action],['Actor ID',r=>r.userId || 'Anonymous'],['Resource ID',r=>r.resourceId],['When',r=>new Date(r.timestamp).toLocaleString()]],
};
export function AdminRecords({ section }) {
  const resource=useResource(`admin-${section}`,()=>api.adminRecords(section));
  return <section><h2>{title(section)}</h2><Gate resource={resource}>{data=><RecordsTable columns={columns[section]} rows={[...data.data].reverse()}/>}</Gate></section>;
}
const defaults = {
  loans:{name:'',loanType:'HOME',interestRateMin:8.5,interestRateMax:11,apr:9,processingFee:0.5,minIncome:25000,minAge:21,maxAge:70,maxTenureYears:30,maxLoan:10000000,recommendedCreditScore:700,employmentTypes:['salaried'],documentsRequired:['AADHAAR','PAN','SALARY_SLIP','BANK_STATEMENT'],partnerStatus:'DEMO_NOT_PARTNERED',officialUrl:'',enabled:true,features:[],prepaymentCharges:''},
  schemes:{name:'',category:'Housing',description:'Configured demo scheme; official eligibility must be checked.',ministry:'',benefits:[],eligibility:'',minAge:18,maxAge:70,maxAnnualIncome:500000,employmentTypes:[],documentsRequired:[],officialUrl:'',source:'',lastVerified:null,enabled:true},
};
const labels={name:'Name',loanType:'Loan type',interestRateMin:'Indicative interest minimum (%)',interestRateMax:'Indicative interest maximum (%)',apr:'Indicative APR (%)',processingFee:'Processing fee (%)',minIncome:'Minimum monthly income',minAge:'Minimum age',maxAge:'Maximum age',maxTenureYears:'Maximum tenure (years)',maxLoan:'Maximum loan amount',recommendedCreditScore:'Credit score guideline',employmentTypes:'Employment types (comma separated)',documentsRequired:'Required documents (comma separated)',partnerStatus:'Partner status',officialUrl:'Official HTTPS link',features:'Features (comma separated)',prepaymentCharges:'Prepayment terms',category:'Category',description:'Description',ministry:'Ministry (only if sourced)',benefits:'Benefits (comma separated)',eligibility:'Eligibility note',maxAnnualIncome:'Maximum annual income',source:'Source / provenance',lastVerified:'Last verified (only with evidence)'};
function CatalogEditor({ section, record, onSaved, onClose }) {
  const [form,setForm]=useState(Object.fromEntries(Object.entries(defaults[section]).map(([key,value])=>[key,record?.[key] ?? value])));
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');
    try { const body=Object.fromEntries(Object.entries(form).map(([key,value])=>[key,Array.isArray(defaults[section][key])?(Array.isArray(value)?value:String(value).split(',').map(v=>v.trim()).filter(Boolean)):typeof defaults[section][key]==='number'?Number(value):key==='lastVerified'?(value || null):value]));
      await api.saveCatalog(section,record?._id,body);onSaved();
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  return <Modal open title={`${record?'Edit':'Create'} ${section==='loans'?'configured lender':'configured scheme'}`} onClose={onClose}><form onSubmit={save} className="catalog-editor"><Badge>DEMO · CONFIGURED · INDICATIVE</Badge><p className="small muted">These records remain demo data. A source link or review date does not establish a partnership or government affiliation.</p><div className="form-grid">{Object.entries(defaults[section]).filter(([key])=>key!=='enabled').map(([key,value])=>key==='loanType'?<Select key={key} label={labels[key]} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}><option>HOME</option><option>EDUCATION</option></Select>:<Field key={key} label={labels[key]} value={Array.isArray(form[key])?form[key].join(', '):key==='lastVerified'?form[key]?.slice(0,10)||'':form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} disabled={key==='partnerStatus'} required={['name','category','description'].includes(key)||typeof value==='number'} type={typeof value==='number'?'number':key==='lastVerified'?'date':key==='officialUrl'?'url':'text'} step={typeof value==='number'?'any':undefined} min={typeof value==='number'?0:undefined}/>)}</div><label className="consent-check"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>Enabled in the public demo catalog</label>{error&&<Notice tone="error">{error}</Notice>}<div className="actions"><Button type="submit" busy={busy}>Save record</Button><Button onClick={onClose} variant="secondary">Cancel</Button></div></form></Modal>;
}
export function CatalogAdmin({ section }) {
  const resource=useResource(`manage-${section}`,()=>api.adminRecords(section));const [editing,setEditing]=useState(null);
  return <section><div className="section-heading"><h2>{section==='loans'?'Configured lenders':'Configured schemes'}</h2><Button onClick={()=>setEditing({})}>Create {section==='loans'?'lender':'scheme'}</Button></div><Badge>DEMO · CONFIGURED · INDICATIVE</Badge><Gate resource={resource}>{data=><RecordsTable rows={data.data} columns={[
    ['Name',r=>r.name],['Type',r=>r.loanType || r.category],['Mode',r=><Badge>{r.dataMode}</Badge>],['State',r=>r.enabled===false?'Disabled':'Enabled'],
    ...(section==='loans'?[['Indicative rate',r=>`${Number(r.interestRateMin).toFixed(2)}–${Number(r.interestRateMax).toFixed(2)}%`],['Partner status',r=>r.partnerStatus]]:[['Ministry',r=>r.ministry || 'Not sourced'],['Source',r=>r.source || 'Fictional demo record'],['Last verified',r=>date(r.lastVerified)]]),
    ['Manage',r=><Button variant="secondary" onClick={()=>setEditing(r)}>Edit</Button>],
  ]}/>}</Gate>{editing&&<CatalogEditor section={section} record={editing._id?editing:null} onSaved={()=>{setEditing(null);resource.reload();}} onClose={()=>setEditing(null)}/>}</section>;
}
const requestStatuses=['Requested','Accepted','Contacted','Documents Pending','Application Ready','Completed'];
export function AgentAdmin() {
  const resource=useResource('manage-agents',()=>api.adminRecords('agents'));const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function update(id,body,request=false){setBusy(true);setError('');try{await api.updateAgentAdmin(id,body,request);await resource.reload();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section><h2>Agent administration</h2><p className="muted">Demo verification is an internal presentation state. It does not mean regulated or bank-authorized.</p>{error&&<Notice tone="error">{error}</Notice>}<Gate resource={resource}>{data=><><Notice>{data.applicationNote}</Notice><RecordsTable rows={data.data} columns={[
    ['Profile',r=><><strong>{r.name}</strong><p className="small">{r.description}</p><small>{r.city} · {r.languages.join(', ')}<br/>{r.specialties.join(', ')}</small></>],['Ratings',()=> 'No reviews available'],['Demo state',r=>r.demoVerification || 'Unverified'],['Actions',r=><div className="actions">{['Demo verified','Unverified','Suspended'].map(state=><Button key={state} variant="secondary" busy={busy} disabled={r.demoVerification===state} onClick={()=>update(r._id,{demoVerification:state})}>{state==='Demo verified'?'Verify demo agent':state==='Unverified'?'Unverify':'Suspend'}</Button>)}</div>],
  ]}/><h2>Assistance requests</h2><RecordsTable rows={data.requests} columns={[
    ['Applicant ID',r=>r.userId],['Loan / selected lender',r=>{const p=data.products.find(p=>p._id===r.loanProductId);return p?`${p.loanType} · ${p.name}`:'Not selected';}],['Application ID',r=>r.applicationId || 'Not linked'],['Agent',r=>data.data.find(a=>a._id===r.agentId)?.name || 'Unavailable'],['Status',r=><Select label="Request status" value={r.status} disabled={busy} onChange={e=>update(r._id,{status:e.target.value},true)}>{requestStatuses.map(s=><option key={s}>{s}</option>)}</Select>],
  ]}/></>}</Gate></section>;
}
const leadColumns=[['Applicant ID',r=><NavLink className="record-link" to={`/partner/leads/${r._id}`}>{r.applicantId}</NavLink>],['Loan type',r=>r.loanType],['Loan amount',r=>money(r.loanAmount)],['Readiness',r=>`${r.readinessScore}%`],['Document status',r=>r.documentStatus],['Consent',r=><Badge tone="green">{r.consent}</Badge>],['Application status',r=>r.status],['Partner stage',r=>r.partnerStage],['Date',r=>date(r.createdAt)],['Open',r=><Button to={`/partner/leads/${r._id}`} variant="secondary">View lead</Button>]];
export function PartnerOverview({ leadsOnly=false }) {
  const resource=useResource('partner-leads',api.partnerLeads);
  return <Gate resource={resource}>{data=><><div className="section-heading"><h2>{leadsOnly?'Consented applicant leads':'Local workflow overview'}</h2><Button variant="secondary" onClick={resource.reload}>Refresh</Button></div>{!leadsOnly&&<><Badge>DEMO METRICS</Badge><Stats metrics={data.metrics}/><Notice>Conversion means completed local preparation workflows divided by currently consented leads. It is not a credit approval or lending rate. No real lender is connected.</Notice><p className="muted">SubmitSafe demonstrates a consented, prepared submission package. Readiness helps a lender review completeness; underwriting remains the lender’s responsibility.</p></>}<RecordsTable columns={leadColumns} rows={data.data} empty="No consented leads yet."/><p className="small muted">Only assigned demo products with active application-sharing consent appear. Revoking consent removes the lead. Readiness includes only the documents shared in that consent.</p></>}</Gate>;
}
const leadActions={New:['accept','request-document','reject'],Accepted:['review','request-document','reject'],'Under Review':['complete','request-document','reject'],'Documents Pending':['review','reject'],Rejected:[],Completed:[]};
const actionLabels={accept:'Accept Lead',review:'Mark Under Review','request-document':'Request Additional Document',reject:'Reject Lead',complete:'Mark Completed'};
export function LeadDetail() {
  const {id}=useParams();const resource=useResource(`lead-${id}`,()=>api.partnerLead(id));const [busy,setBusy]=useState(false);const [note,setNote]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');
  async function act(action){setBusy(true);setError('');setMessage('');try{const result=await api.updateLead(id,{action,note});setMessage(result.message);await resource.reload();}catch(e){setError(e.message);if(e.status===404)resource.reload();}finally{setBusy(false);}}
  return <Gate resource={resource}>{({data:lead})=><><PageHeading eyebrow={lead.applicationCode} title="A prepared submission, with consent." back="/partner/leads">{lead.lender}</PageHeading><div className="detail-layout"><section className="card"><h2>{lead.applicant.name}</h2><DetailRow label="Age">{lead.applicant.age ?? 'Not provided'}</DetailRow><DetailRow label="Monthly income (self-reported)">{money(lead.applicant.monthlyIncome)}</DetailRow><DetailRow label="Employment">{lead.applicant.employmentType}</DetailRow><DetailRow label="Loan amount">{money(lead.loanAmount)}</DetailRow><DetailRow label="Tenure">{lead.tenure} years</DetailRow><DetailRow label="Application status">{lead.status}</DetailRow><DetailRow label="Partner workflow">{lead.partnerStage}</DetailRow><Notice>{lead.consentMessage}</Notice><h3>Shared document readiness</h3>{[['Identity Ready',['AADHAAR','DRIVING_LICENCE']],['PAN Ready',['PAN']],['Income Proof Ready',['SALARY_SLIP']],['Bank Statement Ready',['BANK_STATEMENT']]].map(([label,types])=>{const checks=lead.documents.filter(d=>types.includes(d.documentType));return <DetailRow key={label} label={label}>{checks.some(d=>d.status==='passed')?'Ready':checks.length?'Needs attention':'Not shared'}</DetailRow>;})}<DetailRow label="Shared package readiness">{lead.readinessScore}% · {lead.documentStatus}</DetailRow><p className="small muted">Source not verified. Raw identity fields and files are not exposed in this portal.</p></section><aside className="card"><Badge>LOCAL DEMO WORKFLOW</Badge><h2>Next action</h2><p>Accepting a lead acknowledges a preparation request. Rejecting it closes this local workflow. Neither is a credit decision.</p>{lead.partnerNote&&<Notice>{lead.partnerNote}</Notice>}<Field label="Document request / workflow note" value={note} maxLength={120} onChange={e=>setNote(e.target.value)} hint="Describe the next step. Do not enter government identifiers."/><div className="lead-actions">{(leadActions[lead.partnerStage]||[]).map(action=><Button key={action} variant={action==='reject'?'secondary':'primary'} busy={busy} onClick={()=>act(action)} disabled={action==='request-document'&&!note.trim() || action==='complete'&&lead.documentStatus!=='Ready'}>{actionLabels[action]}</Button>)}</div>{!(leadActions[lead.partnerStage]||[]).length&&<p>This local workflow is closed.</p>}{error&&<Notice tone="error">{error}</Notice>}{message&&<Notice>{message}</Notice>}<p className="sandbox-note">Actions only update this SubmitSafe database. No lender is contacted.</p></aside></div></>}</Gate>;
}
