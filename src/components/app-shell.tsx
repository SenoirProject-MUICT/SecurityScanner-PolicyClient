import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate, useNavigation, useOutlet } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, CircleHelp, LogOut, Settings, Sparkles, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/stores/auth-store'
import { usePolicyStore } from '@/stores/policy-store'
import { useLabelStore } from '@/stores/label-store'
import { authMode } from '@/libs/auth'
import { supabaseSettings } from '@/libs/supabase'
import { PolicySearch } from '@/components/policy-search'

const navigation = [
  { to: '/', label: 'Overview', end: true },
  { to: '/policies', label: 'Policies', end: false },
  { to: '/labels', label: 'Labels', end: true },
  { to: '/assistant', label: 'Draft with AI', end: true },
]

export function AppShell() {
  return <AppLayout />
}

function AppLayout() {
  const profileMenuRef = useRef<HTMLDetailsElement>(null)
  const location = useLocation()
  const navigationState = useNavigation().state
  const outlet = useOutlet()
  const reduceMotion = useReducedMotion()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isLive = authMode === 'supabase'
  useEffect(() => {
    void usePolicyStore.getState().initialize()
    void useLabelStore.getState().initialize()
    function closeMenu(event: PointerEvent) { if (!profileMenuRef.current?.contains(event.target as Node)) profileMenuRef.current?.removeAttribute('open') }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') profileMenuRef.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeMenu); document.removeEventListener('keydown', closeOnEscape) }
  }, [])
  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  return <div className="app-shell">
    <NavigationProgress state={navigationState} />
    <header className="topbar">
      <NavLink className="wordmark" to="/" aria-label="Policy Desk home">policy<span>desk</span></NavLink>
      <nav className="top-navigation" aria-label="Main navigation">{navigation.map(({ to, label, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${to === '/assistant' ? 'nav-link-ai' : ''} ${isActive ? 'is-active' : ''}`}>{to === '/assistant' ? <><Sparkles className="nav-ai-icon" aria-hidden="true" /><span className="nav-link-content">{label}</span><svg className="nav-ai-border" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ai-border-gradient"><stop offset="0%" stopColor="#7897ff" stopOpacity="0" /><stop offset="50%" stopColor="#718fff" /><stop offset="100%" stopColor="#b4a0ff" /></linearGradient></defs><rect className="nav-ai-border-path" x=".7" y=".7" width="118.6" height="34.6" rx="17" pathLength="100" /></svg></> : label}</NavLink>)}</nav>
      <div className="topbar-actions"><Badge className={`connection-pill ${isLive ? 'connection-live' : 'connection-local'}`}><span className="status-dot" />{isLive ? 'Supabase connected' : 'Local mode'}</Badge><PolicySearch />
        <details ref={profileMenuRef} className="profile-menu">
          <summary className="profile-trigger" aria-label="Open profile menu"><span className="user-avatar">{getInitials(user?.name ?? 'User')}</span><span className="profile-trigger-copy"><strong>{user?.name ?? 'Workspace'}</strong><small>{user?.email ?? ''}</small></span><ChevronDown className="profile-chevron" /></summary>
          <div className="profile-popover"><div className="profile-menu-heading"><span className="user-avatar">{getInitials(user?.name ?? 'User')}</span><span><strong>{user?.name ?? 'Workspace'}</strong><small>{user?.email ?? ''}</small></span></div><div className="profile-menu-divider" /><NavLink to="/settings" className="profile-menu-item" onClick={() => profileMenuRef.current?.removeAttribute('open')}><Settings />Account settings</NavLink><button type="button" className="profile-menu-item profile-signout" onClick={() => void handleSignOut()}><LogOut />Sign out</button></div>
        </details>
      </div>
    </header>
    <main className="main-content"><AnimatePresence mode="wait"><motion.div key={location.pathname} className="route-page-content" initial={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(-4px)' }} transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.23, 1, 0.32, 1] }}>{outlet}</motion.div></AnimatePresence></main>
    <footer className="app-footer"><span><span className="footer-pulse" />{isLive ? 'Connected to Supabase' : 'Working with local sample data'}</span>{!supabaseSettings.configured && <span className="footer-env"><Wifi size={14} /> Supabase keys not added</span>}<a href="https://supabase.com/dashboard/project/_/settings/api-keys" target="_blank" rel="noreferrer">Connection settings <CircleHelp size={15} /></a></footer>
  </div>
}

function NavigationProgress({ state }: { state: 'idle' | 'loading' | 'submitting' }) {
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const pending = state !== 'idle'

  useEffect(() => {
    if (pending) {
      window.clearTimeout(hideTimer.current)
      setVisible(true)
      return
    }
    if (visible) hideTimer.current = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(hideTimer.current)
  }, [pending, visible])

  return <div className={`navigation-progress ${visible ? 'is-visible' : ''} ${pending ? 'is-pending' : ''}`} aria-hidden="true"><span /></div>
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="section-description">{description}</p>}</div>{action && <div className="section-action">{action}</div>}</div>
}

function getInitials(value: string) { return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') }
