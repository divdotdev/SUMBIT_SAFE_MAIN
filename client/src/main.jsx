import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './styles.css';
import { AppProvider, Protected } from './context/AppContext';
import Layout from './components/Layout';
import { Empty } from './components/UI';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import LoanWizard from './pages/LoanWizard';
import { LoanResults, LoanCompare, LoanDetail } from './pages/Loans';
import { Documents, DocumentUpload, DocumentDetail } from './pages/Documents';
import { PrepareApplication, Applications, ApplicationDetail } from './pages/Applications';
import { Schemes, SchemeResults, SchemeDetail } from './pages/Schemes';
import { Agents, AgentDetail } from './pages/Agents';
import { Dashboard, Profile, Settings } from './pages/Account';
const secure=component=><Protected>{component}</Protected>;
class ErrorBoundary extends React.Component {
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}
  render(){return this.state.failed?<div className="empty-state"><h1>Let’s take a fresh start.</h1><p>Something on this page didn’t load as expected.</p><a className="button button-primary" href="/">Back to SubmitSafe</a></div>:this.props.children;}
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><BrowserRouter><AppProvider><Routes><Route element={<Layout/>}>
  <Route path="/" element={<Landing/>}/><Route path="/login" element={<Auth key="login"/>}/><Route path="/register" element={<Auth key="register" register/>}/>
  <Route path="/dashboard" element={secure(<Dashboard/>)}/><Route path="/profile" element={secure(<Profile/>)}/><Route path="/settings" element={secure(<Settings/>)}/>
  <Route path="/loans" element={<LoanWizard key="all"/>}/>{['home','personal','education','car'].map(type=><Route key={type} path={`/loans/${type}`} element={<LoanWizard key={type} type={type}/>}/>)}
  <Route path="/loans/results" element={<LoanResults/>}/><Route path="/loans/compare" element={<LoanCompare/>}/><Route path="/loans/:id" element={<LoanDetail/>}/><Route path="/loans/:id/prepare" element={secure(<PrepareApplication/>)}/><Route path="/loans/:id/apply" element={secure(<PrepareApplication review/>)}/>
  <Route path="/documents" element={secure(<Documents/>)}/><Route path="/documents/upload" element={secure(<DocumentUpload/>)}/><Route path="/documents/:id" element={secure(<DocumentDetail/>)}/>
  <Route path="/schemes" element={<Schemes/>}/><Route path="/schemes/results" element={<SchemeResults/>}/><Route path="/schemes/:id" element={<SchemeDetail/>}/><Route path="/agents" element={<Agents/>}/><Route path="/agents/:id" element={<AgentDetail/>}/>
  <Route path="/applications" element={secure(<Applications/>)}/><Route path="/applications/:id" element={secure(<ApplicationDetail/>)}/><Route path="*" element={<Empty title="This page took a different turn." to="/" action="Back to home">Let’s get you back on track.</Empty>}/>
</Route></Routes></AppProvider></BrowserRouter></ErrorBoundary>);
