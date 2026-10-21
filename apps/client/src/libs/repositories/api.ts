import { apiRequest, ApiRoute, HttpMethod, queryString } from '@/libs/api/client'
import type { RepositoryConnection, RepositoryIntegrationRepository, ReviewRequest, ReviewRequestDetail } from './types'

export const apiRepositoryIntegration: RepositoryIntegrationRepository = {
  listConnections(workspaceId) {
    return apiRequest<RepositoryConnection[]>(`${ApiRoute.repositoryConnections.collection}?${queryString({ workspace_id: workspaceId })}`)
  },
  async connect(workspaceId) {
    const { url } = await apiRequest<{ url: string }>(`${ApiRoute.integrations.githubInstallUrl}?${queryString({ workspace_id: workspaceId })}`)
    return { kind: 'redirect', url }
  },
  sync(connectionId, workspaceId) {
    return apiRequest<RepositoryConnection>(`${ApiRoute.repositoryConnections.sync(connectionId)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Post })
  },
  async disconnect(connectionId, workspaceId) {
    await apiRequest<void>(`${ApiRoute.repositoryConnections.item(connectionId)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Delete })
  },
  listReviewRequests(workspaceId, filters) {
    const params: Record<string, string> = { workspace_id: workspaceId, state: filters.state }
    if (filters.repositoryId) params.repository_id = filters.repositoryId
    return apiRequest<ReviewRequest[]>(`${ApiRoute.reviewRequests.collection}?${queryString(params)}`)
  },
  getReviewRequest(id, workspaceId) {
    return apiRequest<ReviewRequestDetail>(`${ApiRoute.reviewRequests.item(id)}?${queryString({ workspace_id: workspaceId })}`)
  },
}
