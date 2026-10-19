import { apiRequest, ApiRoute, HttpMethod, queryString } from '@/libs/api/client'
import type { LabelRepository, PolicyLabel } from './types'

export const apiLabelRepository: LabelRepository = {
  list(workspaceId) {
    return apiRequest<PolicyLabel[]>(`${ApiRoute.labels.collection}?${queryString({ workspace_id: workspaceId })}`)
  },
  create(name, _ownerId, _createdBy, workspaceId) {
    return apiRequest<PolicyLabel>(`${ApiRoute.labels.collection}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Post, data: { name } })
  },
  update(id, name, workspaceId) {
    return apiRequest<PolicyLabel>(`${ApiRoute.labels.item(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Patch, data: { name } })
  },
  async delete(id, workspaceId) {
    await apiRequest<void>(`${ApiRoute.labels.item(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Delete })
  },
}
