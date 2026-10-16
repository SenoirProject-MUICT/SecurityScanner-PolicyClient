import { create } from 'zustand'
import { authService, type AuthUser } from '@/libs/auth'

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<AuthUser>
  signUp: (email: string, password: string, name: string) => Promise<AuthUser | null>
  updateProfile: (name: string) => Promise<AuthUser>
  signOut: () => Promise<void>
}

let initialization: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  initialize: () => {
    if (!initialization) {
      initialization = (async () => {
        authService.subscribe((user) => set({ user }))
        try { set({ user: await authService.getCurrentUser() }) }
        catch { set({ user: null }) }
        finally { set({ isLoading: false }) }
      })()
    }
    return initialization
  },
  signIn: async (email, password) => {
    const user = await authService.signIn(email, password)
    set({ user })
    return user
  },
  signUp: async (email, password, name) => {
    const user = await authService.signUp(email, password, name)
    if (user) set({ user })
    return user
  },
  updateProfile: async (name) => {
    const user = await authService.updateProfile(name)
    set({ user })
    return user
  },
  signOut: async () => {
    await authService.signOut()
    set({ user: null })
  },
}))

export function initializeAuthStore() {
  return useAuthStore.getState().initialize()
}

export function useAuth() {
  return useAuthStore()
}
