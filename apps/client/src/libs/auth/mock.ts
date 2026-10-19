import type { AuthService, AuthUser } from './types'
import { simulateMockLoading } from '@/libs/mock-delay'

const storageKey = 'policy-desk.mock-auth.v1'
const demoUser: AuthUser = { id: 'mock-demo-user', name: 'Alex Morgan', email: 'alex@policydesk.demo' }

export const mockAuthService: AuthService = {
  async getCurrentUser() { await simulateMockLoading(); return readSession() },
  async signIn(email, password) {
    if (!email.trim() || password.length < 6) throw new Error('Enter a valid email and a password with at least 6 characters.')
    const normalizedEmail = email.trim().toLocaleLowerCase()
    const user = normalizedEmail === demoUser.email ? demoUser : {
      id: `mock-${simpleHash(normalizedEmail)}`,
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0].split(/[._-]/).map(capitalize).join(' '),
    }
    writeSession(user)
    notify(user)
    return user
  },
  async signUp(email, password, name) {
    if (!email.trim() || password.length < 6) throw new Error('Enter a valid email and a password with at least 6 characters.')
    const user = { id: `mock-${simpleHash(email.trim().toLocaleLowerCase())}`, email: email.trim().toLocaleLowerCase(), name: name.trim() || 'New member' }
    writeSession(user)
    notify(user)
    return user
  },
  async updateProfile(name) {
    const current = readSession()
    if (!current) throw new Error('Sign in before updating your profile.')
    const updated = { ...current, name: name.trim() || current.name }
    writeSession(updated)
    notify(updated)
    return updated
  },
  async signOut() { writeSession(null); notify(null) },
  subscribe(listener) {
    const handler = (event: Event) => listener((event as CustomEvent<AuthUser | null>).detail)
    window.addEventListener('policy-desk:auth', handler)
    return { unsubscribe: () => window.removeEventListener('policy-desk:auth', handler) }
  },
}

function readSession(): AuthUser | null {
  try { const stored = window.localStorage.getItem(storageKey); return stored ? JSON.parse(stored) as AuthUser : null } catch { return null }
}
function writeSession(user: AuthUser | null) { if (user) window.localStorage.setItem(storageKey, JSON.stringify(user)); else window.localStorage.removeItem(storageKey) }
function notify(user: AuthUser | null) { window.dispatchEvent(new CustomEvent('policy-desk:auth', { detail: user })) }
function simpleHash(value: string) { let hash = 2166136261; for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619); return (hash >>> 0).toString(36) }
function capitalize(value: string) { return value ? value[0].toLocaleUpperCase() + value.slice(1) : value }
