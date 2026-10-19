import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/libs/supabase'
import type { AuthService, AuthUser } from './types'

export const supabaseAuthService: AuthService = {
  async getCurrentUser() {
    const { data, error } = await supabase!.auth.getSession()
    if (error) throw error
    return data.session?.user ? mapUser(data.session) : null
  },
  async signIn(email, password) {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.session) throw new Error('No active session was returned. Try signing in again.')
    return mapUser(data.session)
  },
  async signUp(email, password, name) {
    const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) throw error
    // Supabase may return an obfuscated user with no identities when this
    // email is already registered. It is not a successful new registration.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email may already exist. Try signing in instead.')
    }
    return data.session ? mapUser(data.session) : null
  },
  async updateProfile(name) {
    const { data, error } = await supabase!.auth.updateUser({ data: { full_name: name.trim() } })
    if (error) throw error
    return mapUser(data.user)
  },
  async signOut() { const { error } = await supabase!.auth.signOut(); if (error) throw error },
  subscribe(listener) {
    const { data } = supabase!.auth.onAuthStateChange((_event: AuthChangeEvent, session) => listener(session?.user ? mapUser(session) : null))
    return { unsubscribe: () => data.subscription.unsubscribe() }
  },
}

function mapUser(source: Session | User): AuthUser {
  const user = 'user' in source ? source.user : source
  return { id: user.id, email: user.email ?? '', name: (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || user.email?.split('@')[0] || 'Policy member' }
}
