import { apiRequest, ApiRoute, HttpMethod, queryString } from '@/libs/api/client'
import type { Policy, PolicyActivity, PolicyActivityType, PolicyApprovalEvent, PolicyInput, PolicyRepository, PolicyToggleStatus } from './types'

export const apiPolicyRepository: PolicyRepository = {
  list(workspaceId) {
    return apiRequest<Policy[]>(`${ApiRoute.policies.collection}?${queryString({ workspace_id: workspaceId })}`)
  },
  create(input) {
    return apiRequest<Policy>(`${ApiRoute.policies.collection}?${queryString({ workspace_id: input.workspaceId })}`, { method: HttpMethod.Post, data: toPolicyPayload(input) })
  },
  update(id, input) {
    return apiRequest<Policy>(`${ApiRoute.policies.item(id)}?${queryString({ workspace_id: input.workspaceId })}`, { method: HttpMethod.Put, data: toPolicyPayload(input) })
  },
  async delete(id, workspaceId) {
    await apiRequest<void>(`${ApiRoute.policies.item(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Delete })
  },
  setStatus(id, status: PolicyToggleStatus, workspaceId) {
    return apiRequest<Policy>(`${ApiRoute.policies.status(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Patch, data: { status } })
  },
  submit(id, workspaceId, note) {
    return apiRequest<Policy>(`${ApiRoute.policies.submit(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Post, data: { note } })
  },
  approve(id, workspaceId, note) {
    return apiRequest<Policy>(`${ApiRoute.policies.approve(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Post, data: { note } })
  },
  reject(id, workspaceId, note) {
    return apiRequest<Policy>(`${ApiRoute.policies.reject(id)}?${queryString({ workspace_id: workspaceId })}`, { method: HttpMethod.Post, data: { note } })
  },
  listHistory(id, workspaceId) {
    return apiRequest<PolicyApprovalEvent[]>(`${ApiRoute.policies.history(id)}?${queryString({ workspace_id: workspaceId })}`)
  },
  listActivity(workspaceId) {
    return apiRequest<PolicyActivity[]>(`${ApiRoute.policies.activity}?${queryString({ workspace_id: workspaceId })}`)
  },
  async recordActivity(policy, type: PolicyActivityType, ownerId) {
    void ownerId // The API derives the actor from the verified session.
    await apiRequest<void>(`${ApiRoute.policies.activity}?${queryString({ workspace_id: policy.workspaceId })}`, {
      method: HttpMethod.Post, data: { policyId: policy.id, policyName: policy.name, activityType: type },
    })
  },
}

function toPolicyPayload(input: PolicyInput) {
  return {
    name: input.name,
    description: input.description,
    labels: input.labels,
    status: input.status,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil,
  }
}
