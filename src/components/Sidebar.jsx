import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, LayoutGrid, Upload, ShieldCheck, Settings2,
  User, LogOut, ChevronUp, ChevronDown, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, Info, Menu, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

/* ── Shared inner nav content (used by both desktop sidebar and mobile drawer) ── */
function SidebarContent({ collapsed, onNav, onSignOut, dropOpen, setDropOpen, dropRef, user, profile, theme, toggle }) {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const isMod   = profile?.role === 'moderator' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  const navCls = ({ isActive }) =>
    'nav-link' + (isActive ? ' active' : '') + (collapsed ? ' nav-link-icon-only' : '');

  function NavItem({ to, end, icon: Icon, label }) {
    return (
      <NavLink to={to} end={end} className={navCls} title={collapsed ? label : undefined} onClick={onNav}>
        <Icon size={16} className="nav-link-icon" />
        {!collapsed && <span className="nav-link-label">{label}</span>}
      </NavLink>
    );
  }

  return (
    <>
      {!collapsed && <div className="nav-section-label">Navigation</div>}
      <NavItem to="/" end icon={Home} label="Home" />
      <NavItem to="/browse" icon={LayoutGrid} label="Browse Papers" />
      {user && <NavItem to="/upload" icon={Upload} label="Upload Paper" />}

      {isMod && (
        <>
          {!collapsed && <div className="nav-section-label">Moderation</div>}
          <NavItem to="/mod" icon={ShieldCheck} label="Mod Dashboard" />
        </>
      )}
      {isAdmin && <NavItem to="/admin" icon={Settings2} label="Admin Panel" />}

      <div className="sidebar-spacer" />

      <button
        className={'theme-toggle-sidebar' + (collapsed ? ' icon-only' : '')}
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>

      <NavItem to="/about" icon={Info} label="About Developer" />

      {user ? (
        <div className="sidebar-bottom">
          <div
            className={'sidebar-user' + (collapsed ? ' sidebar-user-collapsed' : '')}
            ref={dropRef}
            onClick={() => setDropOpen(v => !v)}
            title={collapsed ? (profile?.full_name ?? 'User') : undefined}
          >
            <div className="sidebar-avatar">{initials}</div>
            {!collapsed && (
              <>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{profile?.full_name ?? 'User'}</div>
                  <div className="sidebar-user-role">{profile?.role ?? 'student'}</div>
                </div>
                {dropOpen
                  ? <ChevronUp size={13} className="sidebar-chevron" />
                  : <ChevronDown size={13} className="sidebar-chevron" />
                }
              </>
            )}
            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  className={'sidebar-user-dropdown' + (collapsed ? ' dropdown-collapsed' : '')}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link to="/profile" onClick={() => { setDropOpen(false); onNav?.(); }}>
                    <User size={13} /> Profile
                  </Link>
                  <div className="sidebar-drop-divider" />
                  <button onClick={onSignOut}>
                    <LogOut size={13} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        !collapsed && (
          <div className="sidebar-auth-links">
            <Link to="/register" className="btn-sidebar-primary" onClick={onNav}>Create Account</Link>
            <Link to="/login"    className="btn-sidebar-ghost"    onClick={onNav}>Sign In</Link>
          </div>
        )
      )}
    </>
  );
}

export default function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [collapsed,  setCollapsed]  = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef  = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleSignOut() {
    setDropOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate('/');
  }

  const sharedProps = { user, profile, theme, toggle, dropOpen, setDropOpen, dropRef, onSignOut: handleSignOut };

  // Keep a CSS variable in sync so main-content can use margin-left without JS
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-current-width', collapsed ? '56px' : '240px');
  }, [collapsed]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        className={'sidebar sidebar-desktop' + (collapsed ? ' sidebar-collapsed' : '')}
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        initial={false}
      >
        <div className="sidebar-header">
          {!collapsed && (
            <Link to="/" className="sidebar-logo">PaperVault</Link>
          )}
          <button
            className={'sidebar-collapse-btn' + (collapsed ? ' sidebar-collapse-btn-only' : '')}
            onClick={() => { setCollapsed(v => !v); setDropOpen(false); }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <SidebarContent collapsed={collapsed} {...sharedProps} />
      </motion.aside>

      {/* ── Mobile topbar ── */}
      <div className="mobile-topbar">
        <Link to="/" className="mobile-topbar-logo">
          <span>PaperVault</span>
        </Link>
        <button className="mobile-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="sidebar mobile-drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              <div className="sidebar-header">
                <Link to="/" className="sidebar-logo" onClick={() => setMobileOpen(false)}>
                  PaperVault
                </Link>
                <button className="sidebar-collapse-btn" onClick={() => setMobileOpen(false)} title="Close menu">
                  <X size={16} />
                </button>
              </div>
              <SidebarContent collapsed={false} onNav={() => setMobileOpen(false)} {...sharedProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
