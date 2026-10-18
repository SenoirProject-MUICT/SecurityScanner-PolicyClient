import { supabaseSettings } from '@/libs/supabase'

export const RuntimeMode = {
  Mock: 'mock',
  Production: 'production',
} as const

export type RuntimeMode = (typeof RuntimeMode)[keyof typeof RuntimeMode]

/** Resolve once from build-time configuration; production requires valid Supabase credentials. */
export function resolveRuntimeMode(requestedMode: string | undefined): RuntimeMode {
  const normalizedMode = requestedMode?.trim().toLowerCase() || RuntimeMode.Production
  const productionRequested = normalizedMode === RuntimeMode.Production || normalizedMode === 'supabase'

  return productionRequested && supabaseSettings.configured
    ? RuntimeMode.Production
    : RuntimeMode.Mock
}
