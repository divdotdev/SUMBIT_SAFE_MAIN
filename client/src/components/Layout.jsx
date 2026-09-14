import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, UserRound, ArrowUpRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from './UI';
export function Logo() { return <Link className="logo" to="/" aria-label="SubmitSafe home"><span className="logo-mark"><ShieldCheck size={24}/></span>Submit<span>Safe</span><i/></Link>; }
export default function Layout() {
  const { health, user, logout, notice } = useApp(); const [menu, setMenu] = useState(false); const location = useLocation();
  useEffect(() => { setMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }); document.title = `${location.pathname === '/' ? 'Know before you submit.' : location.pathname.split('/')[1].replace(/^./, c => c.toUpperCase())} — SubmitSafe`; }, [location.pathname]);
  const links = [['/loans', 'Loans'], ['/schemes', 'Schemes'], ['/documents', 'Documents'], ['/applications', 'Applications']];
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    {health?.appMode === 'MOCK' && <div className="demo-banner"><span className="demo-dot"/><strong>SubmitSafe Demo</strong><span className="banner-divider">—</span> eligibility, lender data and verification results shown here are for demonstration.</div>}
    {health?.status === 'offline' && <div className="offline-banner" role="status">We’re having trouble connecting. You can explore, and try again shortly.</div>}
    <header className="site-header"><div className="nav-wrap"><Logo/><nav className="desktop-nav" aria-label="Main navigation">{links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav><div className="nav-right"><Link to="/dashboard" className="dashboard-link">Dashboard <ArrowUpRight size={14}/></Link>{user ? <Link to="/profile" className="profile-link" aria-label="Profile">{user.name.charAt(0)}</Link> : <Button to="/login" variant="secondary" className="nav-login">Sign in <UserRound size={16}/></Button>}<button className="icon-button menu-button" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></div>
      {menu && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">{[...links, ['/dashboard', 'Dashboard'], ['/profile', 'Profile'], ['/settings', 'Settings'], ['/agents', 'Expert assistance']].map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}{user ? <button onClick={logout}>Sign out</button> : <Link to="/login">Sign in</Link>}</nav>}
    </header>
    <main id="main"><Outlet/></main>
    <footer className="site-footer"><div className="footer-top"><div><Logo/><p>A little clarity.<br/>A more confident next step.</p></div><div><h3>Your next step</h3><Link to="/loans">Find a loan</Link><Link to="/schemes">Explore schemes</Link><Link to="/documents">Check documents</Link></div><div><h3>Here to help</h3><Link to="/agents">Expert assistance</Link><Link to="/settings">Privacy & consent</Link><Link to="/profile">Your profile</Link></div><div className="footer-promise"><ShieldCheck size={23}/><strong>Know before you submit.</strong><p>Find the right loan, prepare your documents, and apply with confidence.</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SubmitSafe</span><span>Made for your next chapter.</span><span>Independent. Informative. On your side.</span></div></footer>
    {notice && <div className="toast" role="status"><Check size={18}/>{notice}</div>}
  </>;
}
