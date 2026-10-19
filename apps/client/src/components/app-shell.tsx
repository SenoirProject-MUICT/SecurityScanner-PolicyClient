import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate, useNavigation, useOutlet } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Building2, ChevronDown, FileText, LayoutDashboard, LogOut, Settings, Sparkles, Tags, UsersRound } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from '@/components/ui/select'
import { useAuth } from '@/stores/auth-store'
import { useAuthMutations } from '@/libs/auth/hooks'
import { PolicySearch } from '@/components/policy-search'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { withWorkspaceId } from '@/libs/workspaces/navigation'
import { useWorkspaces } from '@/libs/workspaces/hooks'

const navigation = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/policies', label: 'Policies', end: false, icon: FileText },
  { to: '/labels', label: 'Labels', end: true, icon: Tags },
  { to: '/team', label: 'Team', end: true, icon: UsersRound },
  { to: '/assistant', label: 'Draft with AI', end: true, icon: Sparkles },
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
  const { user } = useAuth()
  const { signOut } = useAuthMutations()
  const navigate = useNavigate()
  const { workspaces } = useWorkspaces()
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const enterWorkspace = useWorkspaceStore((state) => state.enterWorkspace)
  const leaveWorkspace = useWorkspaceStore((state) => state.leaveWorkspace)
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
  const routeTitle = getRouteTitle(location.pathname)
  function switchWorkspace(workspaceId: string) {
    enterWorkspace(workspaceId)
    const restOfPath = location.pathname.split('/').filter(Boolean).slice(1).join('/')
    const targetPath = withWorkspaceId(restOfPath ? `/${restOfPath}` : '/', workspaceId)
    navigate(`${targetPath}${location.search}${location.hash}`, { replace: true })
  }
  useEffect(() => {
    function closeMenu(event: PointerEvent) { if (!profileMenuRef.current?.contains(event.target as Node)) profileMenuRef.current?.removeAttribute('open') }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') profileMenuRef.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeMenu); document.removeEventListener('keydown', closeOnEscape) }
  }, [])
  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  return <div className="app-shell">
    <NavigationProgress state={navigationState} />
    <TooltipProvider>
      <SidebarProvider className="app-workspace-layout" style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3.25rem' } as CSSProperties}>
        <AppSidebar
          workspaceId={selectedWorkspaceId}
          workspaceName={selectedWorkspace?.name ?? 'Your workspace'}
          workspaces={workspaces}
          onSelectWorkspace={switchWorkspace}
          onGoHome={leaveWorkspace}
        />
        <div className="app-main-column">
        <header className="topbar">
          <div className="topbar-context">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Breadcrumb className="workspace-breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink render={<NavLink to={withWorkspaceId('/', selectedWorkspaceId)} />}>{selectedWorkspace?.name ?? 'Workspace'}</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{routeTitle}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="topbar-actions"><PolicySearch />
            <details ref={profileMenuRef} className="profile-menu">
              <summary className="profile-trigger" aria-label="Open profile menu"><span className="user-avatar">{getInitials(user?.name ?? 'User')}</span><span className="profile-trigger-copy"><strong>{user?.name ?? 'Workspace'}</strong><small>{user?.email ?? ''}</small></span><ChevronDown className="profile-chevron" /></summary>
              <div className="profile-popover"><div className="profile-menu-heading"><span className="user-avatar">{getInitials(user?.name ?? 'User')}</span><span><strong>{user?.name ?? 'Workspace'}</strong><small>{user?.email ?? ''}</small></span></div><div className="profile-menu-divider" /><NavLink to="/" className="profile-menu-item" onClick={() => profileMenuRef.current?.removeAttribute('open')}><Building2 />Manage workspaces</NavLink><NavLink to={withWorkspaceId('/settings', selectedWorkspaceId)} className="profile-menu-item" onClick={() => profileMenuRef.current?.removeAttribute('open')}><Settings />Account settings</NavLink><button type="button" className="profile-menu-item profile-signout" onClick={() => void handleSignOut()}><LogOut />Sign out</button></div>
            </details>
          </div>
        </header>
        <SidebarInset className="main-content"><AnimatePresence mode="wait"><motion.div key={location.pathname} className="route-page-content" initial={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(-4px)' }} transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.23, 1, 0.32, 1] }}>{outlet}</motion.div></AnimatePresence></SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  </div>
}

function AppSidebar({ workspaceId, workspaceName, workspaces, onSelectWorkspace, onGoHome }: { workspaceId: string; workspaceName: string; workspaces: Array<{ id: string; name: string }>; onSelectWorkspace: (workspaceId: string) => void; onGoHome: () => void }) {
  const pathname = useLocation().pathname

  return <Sidebar collapsible="icon" className="app-sidebar">
    <SidebarHeader className="app-sidebar-header">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="app-sidebar-brand" size="lg" tooltip="PolicyDesk" render={<NavLink to="/" onClick={onGoHome} />}>
            <span className="sidebar-brand-mark">P</span><span className="sidebar-brand-word">Policy<span>Desk</span></span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Select value={workspaceId || null} onValueChange={(value) => { if (value) onSelectWorkspace(value) }}>
        <SelectTrigger className="sidebar-workspace-select" aria-label={`Switch workspace, currently ${workspaceName}`} title={workspaceName}>
          <Building2 aria-hidden="true" /><span className="sidebar-workspace-current">{workspaceName}</span>
        </SelectTrigger>
        <SelectContent align="start" className="sidebar-workspace-options">
          <SelectGroup>
            <SelectLabel>Switch workspace</SelectLabel>
            {workspaces.map((workspace) => <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SidebarHeader>
    <SidebarContent className="app-sidebar-content">
      <SidebarGroup>
        <SidebarGroupLabel>Main menu</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigation.map(({ to, label, end, icon: Icon }) => {
              const isActive = isNavigationActive(to, pathname, workspaceId)
              return <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  className={[to === '/assistant' && 'sidebar-ai-button', isActive && 'sidebar-active-page'].filter(Boolean).join(' ')}
                  isActive={isActive}
                  tooltip={label}
                  render={<NavLink to={withWorkspaceId(to, workspaceId)} end={end} />}
                >
                  <Icon aria-hidden="true" /><span>{label}</span>{to === '/assistant' && <span className="sidebar-ai-badge">AI</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter className="app-sidebar-footer">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className={isNavigationActive('/workspace-management', pathname, workspaceId) ? 'sidebar-active-page' : undefined} isActive={isNavigationActive('/workspace-management', pathname, workspaceId)} tooltip="Settings" render={<NavLink to={withWorkspaceId('/workspace-management', workspaceId)} />}>
            <Settings aria-hidden="true" /><span>Settings</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
}

function isNavigationActive(to: string, pathname: string, workspaceId: string) {
  const target = withWorkspaceId(to, workspaceId)
  if (to === '/') return pathname === target
  if (to === '/policies') return pathname === target || pathname.startsWith(`${target}/`)
  return pathname === target || pathname.startsWith(`${target}/`)
}

function NavigationProgress({ state }: { state: 'idle' | 'loading' | 'submitting' }) {
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const pending = state !== 'idle'

  useEffect(() => {
    if (pending) {
      window.clearTimeout(hideTimer.current)
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

function getRouteTitle(pathname: string) {
  const routePath = `/${pathname.split('/').filter(Boolean).slice(1).join('/')}`
  if (routePath.startsWith('/policies/')) return 'Policy details'
  return navigation.find((item) => item.to === routePath)?.label ?? 'Overview'
}
