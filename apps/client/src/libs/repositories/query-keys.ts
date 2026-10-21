import type { ReviewRequestFilters } from './types'

export const repositoryQueryKeys = {
  connections: (workspaceId: string) => ['repository-connections', workspaceId] as const,
  allReviewRequests: (workspaceId: string) => ['review-requests', workspaceId] as const,
  reviewRequests: (workspaceId: string, filters: ReviewRequestFilters) => ['review-requests', workspaceId, 'list', filters.repositoryId ?? 'all', filters.state] as const,
  reviewRequest: (workspaceId: string, id: string) => ['review-requests', workspaceId, 'detail', id] as const,
}

export const repositoryMutationKeys = {
  connect: (workspaceId: string) => ['repository-connections', 'connect', workspaceId] as const,
  sync: (workspaceId: string) => ['repository-connections', 'sync', workspaceId] as const,
  disconnect: (workspaceId: string) => ['repository-connections', 'disconnect', workspaceId] as const,
}
