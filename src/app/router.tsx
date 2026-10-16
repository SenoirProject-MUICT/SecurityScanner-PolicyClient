import { useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { initializeAuthStore, useAuth } from '@/stores/auth-store'
import { AppShell } from '@/components/app-shell'
import { WorkspaceLoading } from '@/components/workspace-loading'

const router = createBrowserRouter([{ element: <AuthRoot />, children: [
  { path: '/login', lazy: async () => ({ Component: (await import('@/pages/login/page')).LoginPage }) },
  { element: <ProtectedLayout />, children: [
    { element: <AppShell />, children: [
      { index: true, lazy: async () => ({ Component: (await import('@/pages/overview/page')).OverviewPage }) },
      { path: 'policies', lazy: async () => ({ Component: (await import('@/pages/policies/page')).PoliciesPage }) },
      { path: 'policies/:policyId', lazy: async () => ({ Component: (await import('@/pages/policy-detail/page')).PolicyDetailPage }) },
      { path: 'labels', lazy: async () => ({ Component: (await import('@/pages/labels/page')).LabelsPage }) },
      { path: 'assistant', lazy: async () => ({ Component: (await import('@/pages/assistant/page')).AssistantPage }) },
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
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  if (!user && !isLoading) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <AnimatePresence mode="wait" initial={false}>
    <motion.div key={isLoading ? 'workspace-loading' : 'workspace-ready'} className="workspace-transition" initial={{ opacity: 0, transform: reduceMotion ? 'scale(1)' : 'scale(.96)' }} animate={{ opacity: 1, transform: 'scale(1)' }} exit={{ opacity: 0, transform: reduceMotion ? 'scale(1)' : 'scale(.985)' }} transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.23, 1, 0.32, 1] }}>
      {isLoading ? <WorkspaceLoading /> : <Outlet />}
    </motion.div>
  </AnimatePresence>
}
