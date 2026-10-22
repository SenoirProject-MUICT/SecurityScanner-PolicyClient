import { mockRepositoryIntegration } from './mock'
import { apiRepositoryIntegration } from './api'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import type { ConnectResult, RepositoryConnection, ReviewRequest, ReviewRequestDetail, ReviewRequestFilters } from './types'

export type * from './types'

const isProd = useRuntimeModeStore.getState().isProd
const repository = isProd ? apiRepositoryIntegration : mockRepositoryIntegration

export const listRepositoryConnections = (workspaceId: string): Promise<RepositoryConnection[]> => repository.listConnections(workspaceId)
export const connectGithub = (workspaceId: string): Promise<ConnectResult> => repository.connect(workspaceId)
export const syncRepositoryConnection = (connectionId: string, workspaceId: string): Promise<RepositoryConnection> => repository.sync(connectionId, workspaceId)
export const setLinkedRepositories = (connectionId: string, workspaceId: string, repositoryIds: string[]): Promise<RepositoryConnection> => repository.setLinkedRepositories(connectionId, workspaceId, repositoryIds)
export const disconnectRepositoryConnection = (connectionId: string, workspaceId: string): Promise<void> => repository.disconnect(connectionId, workspaceId)
export const listReviewRequests = (workspaceId: string, filters: ReviewRequestFilters): Promise<ReviewRequest[]> => repository.listReviewRequests(workspaceId, filters)
export const getReviewRequest = (id: string, workspaceId: string): Promise<ReviewRequestDetail> => repository.getReviewRequest(id, workspaceId)
