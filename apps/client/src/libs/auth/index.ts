import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import { apiAuthService } from './api'
import { mockAuthService } from './mock'

export { RuntimeMode } from '@/libs/runtime-mode'
export type { AuthService, AuthUser } from './types'
const isProd = useRuntimeModeStore.getState().isProd
export const authService = isProd ? apiAuthService : mockAuthService
