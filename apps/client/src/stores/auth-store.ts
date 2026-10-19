import { create } from 'zustand'
import { queryClient } from '@/libs/api/query-client'
import { authQueryKeys } from '@/libs/auth/query-keys'
import { authService, type AuthUser } from '@/libs/auth'

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  initialize: () => Promise<void>
}

let initialization: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  initialize: () => {
    if (!initialization) {
      initialization = (async () => {
        authService.subscribe((user) => {
          const previousUser = useAuthStore.getState().user
          if (previousUser && previousUser.id !== user?.id) queryClient.clear()
          set({ user })
        })
        try { set({ user: await queryClient.fetchQuery({ queryKey: authQueryKeys.current(), queryFn: () => authService.getCurrentUser(), staleTime: 0 }) }) }
        catch { set({ user: null }) }
        finally { set({ isLoading: false }) }
      })()
    }
    return initialization
  },
}))

export function initializeAuthStore() {
  return useAuthStore.getState().initialize()
}

export function useAuth() {
  return useAuthStore()
}
