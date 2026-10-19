import { apiRequest, ApiRoute, HttpMethod } from '@/libs/api/client'
import { clearApiSession, notifyApiAuthChange, readApiSession, saveApiSession } from './session'
import type { AuthService, AuthUser } from './types'

type AuthResult = { user: AuthUser; session: { accessToken: string; refreshToken: string; expiresAt: number } | null }

export const apiAuthService: AuthService = {
  async getCurrentUser() {
    if (!readApiSession()) return null
    try {
      const { user } = await apiRequest<{ user: AuthUser }>(ApiRoute.auth.me)
      notifyApiAuthChange(user)
      return user
    } catch (error) {
      clearApiSession()
      notifyApiAuthChange(null)
      throw error
    }
  },
  async signIn(email, password) {
    const result = await apiRequest<AuthResult>(ApiRoute.auth.signIn, { method: HttpMethod.Post, data: { email, password } }, false)
    if (!result.session) throw new Error('No active session was returned. Try signing in again.')
    saveApiSession(result.session)
    notifyApiAuthChange(result.user)
    return result.user
  },
  async signUp(email, password, name) {
    const result = await apiRequest<AuthResult>(ApiRoute.auth.signUp, { method: HttpMethod.Post, data: { email, password, name } }, false)
    if (result.session) saveApiSession(result.session)
    notifyApiAuthChange(result.session ? result.user : null)
    return result.session ? result.user : null
  },
  async updateProfile(name) {
    const { user } = await apiRequest<{ user: AuthUser }>(ApiRoute.auth.me, { method: HttpMethod.Patch, data: { name } })
    notifyApiAuthChange(user)
    return user
  },
  async signOut() {
    try { await apiRequest<void>(ApiRoute.auth.signOut, { method: HttpMethod.Post }) }
    finally { clearApiSession(); notifyApiAuthChange(null) }
  },
  subscribe(listener) {
    const handler = (event: Event) => listener((event as CustomEvent<AuthUser | null>).detail)
    window.addEventListener('policy-desk:api-auth', handler)
    return { unsubscribe: () => window.removeEventListener('policy-desk:api-auth', handler) }
  },
}
