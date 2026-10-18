import { create } from 'zustand'
import { resolveRuntimeMode, RuntimeMode } from '@/libs/runtime-mode'

type RuntimeModeState = {
  mode: RuntimeMode
  isProd: boolean
}

const mode = resolveRuntimeMode(import.meta.env.VITE_DATA_MODE)

/** App-wide, read-only runtime configuration shared by UI and data facades. */
export const useRuntimeModeStore = create<RuntimeModeState>(() => ({
  mode,
  isProd: mode === RuntimeMode.Production,
}))
