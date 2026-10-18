import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import { supabaseAuthService } from './supabase'
import { mockAuthService } from './mock'

export { RuntimeMode } from '@/libs/runtime-mode'
export type { AuthService, AuthUser } from './types'
const isProd = useRuntimeModeStore.getState().isProd
export const authService = isProd ? supabaseAuthService : mockAuthService
