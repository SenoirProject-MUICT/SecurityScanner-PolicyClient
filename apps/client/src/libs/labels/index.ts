import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import { mockLabelRepository } from './mock'
import { apiLabelRepository } from './api'

export type { LabelRepository, PolicyLabel } from './types'
const repository = useRuntimeModeStore.getState().isProd ? apiLabelRepository : mockLabelRepository
export const listLabels = (workspaceId: string) => repository.list(workspaceId)
export const createLabel = (name: string, ownerId: string, createdBy: string, workspaceId: string) => repository.create(name, ownerId, createdBy, workspaceId)
export const updateLabel = (id: string, name: string, workspaceId: string) => repository.update(id, name, workspaceId)
export const deleteLabel = (id: string, workspaceId: string) => repository.delete(id, workspaceId)
