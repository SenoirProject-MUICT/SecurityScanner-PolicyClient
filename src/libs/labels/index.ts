import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import { mockLabelRepository } from './mock'
import { supabaseLabelRepository } from './supabase'

export type { LabelRepository, PolicyLabel } from './types'
const repository = useRuntimeModeStore.getState().isProd ? supabaseLabelRepository : mockLabelRepository
export const listLabels = repository.list
export const createLabel = repository.create
export const updateLabel = repository.update
export const deleteLabel = repository.delete
