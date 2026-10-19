export const RuntimeMode = {
  Mock: 'mock',
  Production: 'production',
} as const

export type RuntimeMode = (typeof RuntimeMode)[keyof typeof RuntimeMode]

/** Production API mode is the default; use VITE_DATA_MODE=mock for local sample data. */
export function resolveRuntimeMode(requestedMode: string | undefined): RuntimeMode {
  const normalizedMode = requestedMode?.trim().toLowerCase() || RuntimeMode.Production
  return normalizedMode === RuntimeMode.Mock ? RuntimeMode.Mock : RuntimeMode.Production
}
