import { activeMode } from '@/libs/policies'
import { supabaseAuthService } from './supabase'
import { mockAuthService } from './mock'

export type { AuthMode, AuthService, AuthUser } from './types'
export const authMode = activeMode
export const authService = activeMode === 'supabase' ? supabaseAuthService : mockAuthService
