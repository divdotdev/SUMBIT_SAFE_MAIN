import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, session } from '../services/api';
import { useSessionState } from '../hooks/useResource';
import { Loading, Problem } from '../components/UI';
const Context = createContext(null);
export function AppProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true); const [authError, setAuthError] = useState(null);
  const [health, setHealth] = useState(null); const [notice, setNotice] = useState('');
  const [loanProfile, setLoanProfile] = useSessionState('submitsafe.loan-profile', null);
  const [compareIds, setCompareIds] = useSessionState('submitsafe.compare', []);
  const [selectedLoan, setSelectedLoan] = useSessionState('submitsafe.selected-loan', null);
  const [schemeProfile, setSchemeProfile] = useSessionState('submitsafe.scheme-profile', null);
  const [savedScheme, setSavedScheme] = useSessionState('submitsafe.saved-scheme', null);
  const [analyses, setAnalyses] = useState({});
  async function refreshUser() {
    setLoading(true); setAuthError(null);
    if (!session.get()) { setLoading(false); return; }
    try { setUser((await api.me()).user); } catch (error) { if (error.status !== 401) setAuthError(error); }
    finally { setLoading(false); }
  }
  function logout() { session.clear(); setUser(null); setLoanProfile(null); setCompareIds([]); setSelectedLoan(null); setSchemeProfile(null); setSavedScheme(null); setAnalyses({}); }
  useEffect(() => { refreshUser(); const expired = () => { logout(); setNotice('Your session has ended. Please sign in again.'); }; window.addEventListener('submitsafe:expired', expired); return () => window.removeEventListener('submitsafe:expired', expired); }, []);
  useEffect(() => { let active = true; const check = () => api.health().then(result => { if (active) setHealth(result); }).catch(() => { if (active) setHealth({ status: 'offline' }); }); check(); const timer = setInterval(check, 60000); return () => { active = false; clearInterval(timer); }; }, []);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); } }, [notice]);
  const authenticate = response => { if (user && user._id !== response.user._id) logout(); session.set(response.token); setUser(response.user); setAuthError(null); };
  return <Context.Provider value={{ user, loading, authError, refreshUser, health, authenticate, logout, notice, setNotice, loanProfile, setLoanProfile, compareIds, setCompareIds, selectedLoan, setSelectedLoan, schemeProfile, setSchemeProfile, savedScheme, setSavedScheme, analyses, setAnalyses }}>{children}</Context.Provider>;
}
export const useApp = () => useContext(Context);
export function Protected({ children }) {
  const { user, loading, authError, refreshUser } = useApp(); const location = useLocation();
  if (loading) return <Loading label="Opening your account…" />;
  if (authError) return <Problem error={authError} retry={refreshUser} />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
