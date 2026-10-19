import { useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { initializeAuthStore, useAuth } from '@/stores/auth-store'
import { AppShell } from '@/components/app-shell'
import { WorkspaceLoading } from '@/components/workspace-loading'
import { useWorkspaces } from '@/libs/workspaces/hooks'
import { WorkspaceAccessDeniedPage, WorkspaceSetupPage } from '@/pages/workspace-setup/page'
import { WorkspacesPage } from '@/pages/workspaces/page'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { withWorkspaceId } from '@/libs/workspaces/navigation'

const router = createBrowserRouter([{ element: <AuthRoot />, children: [
  { path: '/login', lazy: async () => ({ Component: (await import('@/pages/login/page')).LoginPage }) },
  { element: <ProtectedLayout />, children: [
    { index: true, element: null },
    { path: ':workspaceId', element: <AppShell />, children: [
      { index: true, lazy: async () => ({ Component: (await import('@/pages/overview/page')).OverviewPage }) },
      { path: 'policies', lazy: async () => ({ Component: (await import('@/pages/policies/page')).PoliciesPage }) },
      { path: 'policies/:policyId', lazy: async () => ({ Component: (await import('@/pages/policy-detail/page')).PolicyDetailPage }) },
      { path: 'labels', lazy: async () => ({ Component: (await import('@/pages/labels/page')).LabelsPage }) },
      { path: 'team', lazy: async () => ({ Component: (await import('@/pages/team/page')).TeamPage }) },
      { path: 'assistant', lazy: async () => ({ Component: (await import('@/pages/assistant/page')).AssistantPage }) },
      { path: 'workspace-management', lazy: async () => ({ Component: (await import('@/pages/workspace-management/page')).WorkspaceManagementPage }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('@/pages/settings/page')).SettingsPage }) },
    ] },
  ] },
  { path: '*', element: <Navigate to="/" replace /> },
] }])

export function AppRouter() { return <RouterProvider router={router} /> }

function AuthRoot() {
  useEffect(() => { void initializeAuthStore() }, [])
  return <Outlet />
}
function ProtectedLayout() {
  const { user, isLoading } = useAuth()
  const { workspaces, selectedWorkspaceId, enterWorkspace, isLoading: isWorkspaceLoading, error: workspaceError, accessDenied, refetch, createWorkspace, joinWorkspace, isMutating } = useWorkspaces()
  const enteredWorkspaceId = useWorkspaceStore((state) => state.enteredWorkspaceId)
  const leaveWorkspace = useWorkspaceStore((state) => state.leaveWorkspace)
  const location = useLocation()
  const navigate = useNavigate()
  const routeWorkspaceId = useMatches().map((match) => match.params.workspaceId).find(Boolean) ?? ''
  const reduceMotion = useReducedMotion()
  const routeWorkspaceExists = workspaces.some((workspace) => workspace.id === routeWorkspaceId)

  useEffect(() => {
    if (routeWorkspaceExists && routeWorkspaceId) {
      if (enteredWorkspaceId !== routeWorkspaceId || selectedWorkspaceId !== routeWorkspaceId) enterWorkspace(routeWorkspaceId)
    } else if (enteredWorkspaceId) {
      leaveWorkspace()
    }
  }, [routeWorkspaceExists, routeWorkspaceId, enteredWorkspaceId, selectedWorkspaceId, enterWorkspace, leaveWorkspace])

  if (!user && !isLoading) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  const workspaceState = routeWorkspaceId && routeWorkspaceExists
    ? enteredWorkspaceId === routeWorkspaceId && selectedWorkspaceId === routeWorkspaceId ? 'workspace-ready' : 'workspace-restoring'
    : !workspaces.length ? 'workspace-setup' : 'workspace-picker'
  return <AnimatePresence mode="wait" initial={false}>
    <motion.div key={isLoading || isWorkspaceLoading ? 'workspace-loading' : accessDenied ? 'workspace-access-denied' : workspaceError ? 'workspace-error' : workspaceState} className="workspace-transition" initial={{ opacity: 0, transform: reduceMotion ? 'scale(1)' : 'scale(.96)' }} animate={{ opacity: 1, transform: 'scale(1)' }} exit={{ opacity: 0, transform: reduceMotion ? 'scale(1)' : 'scale(.985)' }} transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.23, 1, 0.32, 1] }}>
      {isLoading || isWorkspaceLoading || workspaceState === 'workspace-restoring' ? <WorkspaceLoading /> : accessDenied ? <WorkspaceAccessDeniedPage onRetry={refetch} /> : workspaceError || !workspaces.length ? <WorkspaceSetupPage loadError={workspaceError} createWorkspace={createWorkspace} joinWorkspace={joinWorkspace} onRetry={refetch} isMutating={isMutating} /> : workspaceState === 'workspace-picker' ? <WorkspacesPage workspaces={workspaces} enterWorkspace={(workspaceId) => { enterWorkspace(workspaceId); navigate(withWorkspaceId('/', workspaceId), { replace: true }) }} createWorkspace={createWorkspace} joinWorkspace={joinWorkspace} isMutating={isMutating} /> : <Outlet />}
    </motion.div>
  </AnimatePresence>
}
