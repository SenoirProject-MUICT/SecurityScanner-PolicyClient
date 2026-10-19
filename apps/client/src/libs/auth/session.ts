export type ApiSession = { accessToken: string; refreshToken: string; expiresAt: number }

const storageKey = 'policy-desk.api-auth.v1'

export function readApiSession(): ApiSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<ApiSession>
    return typeof value.accessToken === 'string' && typeof value.refreshToken === 'string' && typeof value.expiresAt === 'number'
      ? value as ApiSession
      : null
  } catch { return null }
}

export function saveApiSession(session: ApiSession) { window.localStorage.setItem(storageKey, JSON.stringify(session)) }
export function clearApiSession() { window.localStorage.removeItem(storageKey) }
export function notifyApiAuthChange(user: import('./types').AuthUser | null) { window.dispatchEvent(new CustomEvent('policy-desk:api-auth', { detail: user })) }
