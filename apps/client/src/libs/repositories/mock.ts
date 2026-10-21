import { simulateMockLoading } from '@/libs/mock-delay'
import { getMockWorkspaceAccess } from '@/libs/workspaces/mock'
import { buildMockRepositories, buildMockRequests, mockAccount, repositoryId } from './mock-fixtures'
import type { ConnectedRepository, RepositoryConnection, RepositoryIntegrationRepository, ReviewRequest, ReviewRequestDetail } from './types'

const storageKey = 'policy-desk.repositories.v1'
const FAILING_REPOSITORY_INDEX = 2
const failureMessage = 'GitHub denied access (403). The app lost permission to this repository. Re-open the GitHub App settings and grant access again, then sync.'

type MockWorkspaceRecord = { connection: RepositoryConnection; requests: ReviewRequestDetail[]; syncCount: number }
type MockStore = Record<string, MockWorkspaceRecord>

export const mockRepositoryIntegration: RepositoryIntegrationRepository = {
  async listConnections(workspaceId) {
    await simulateMockLoading()
    const record = readStore()[workspaceId]
    return record ? [withOpenCounts(record)] : []
  },
  async connect(workspaceId) {
    await simulateMockLoading()
    requireAdmin(workspaceId)
    const store = readStore()
    if (store[workspaceId]) throw new Error('GitHub is already connected to this workspace.')
    const now = new Date().toISOString()
    const connectionId = crypto.randomUUID()
    const connection: RepositoryConnection = {
      id: connectionId, workspaceId, provider: 'github', ...mockAccount, status: 'active', connectedAt: now,
      repositories: buildMockRepositories(connectionId, now),
    }
    const record: MockWorkspaceRecord = { connection, requests: buildMockRequests(workspaceId, connectionId, now), syncCount: 0 }
    writeStore({ ...store, [workspaceId]: record })
    return { kind: 'connected', connection: withOpenCounts(record) }
  },
  async sync(connectionId, workspaceId) {
    await simulateMockLoading()
    requireAdmin(workspaceId)
    const store = readStore()
    const record = store[workspaceId]
    if (!record || record.connection.id !== connectionId) throw new Error('This connection could not be found. Refresh the page and try again.')
    const now = new Date().toISOString()
    const syncCount = record.syncCount + 1
    // Every other sync loses access to one repository, so the failed state and its recovery are both reachable.
    const shouldFail = syncCount % 2 === 1
    const failingId = repositoryId(connectionId, FAILING_REPOSITORY_INDEX)
    const repositories = record.connection.repositories.map((repository): ConnectedRepository => (
      shouldFail && repository.id === failingId
        ? { ...repository, syncStatus: 'failed', syncError: failureMessage }
        : { ...repository, syncStatus: 'succeeded', syncError: null, lastSyncedAt: now }
    ))
    const requests = record.requests.map((request) => request.repositoryId === failingId && shouldFail ? request : { ...request, lastSyncedAt: now })
    const next: MockWorkspaceRecord = { connection: { ...record.connection, repositories }, requests, syncCount }
    writeStore({ ...store, [workspaceId]: next })
    return withOpenCounts(next)
  },
  async disconnect(connectionId, workspaceId) {
    await simulateMockLoading()
    requireAdmin(workspaceId)
    const { [workspaceId]: record, ...rest } = readStore()
    if (!record || record.connection.id !== connectionId) throw new Error('This connection could not be found. Refresh the page and try again.')
    writeStore(rest)
  },
  async listReviewRequests(workspaceId, filters) {
    await simulateMockLoading()
    const record = readStore()[workspaceId]
    if (!record) return []
    return record.requests
      .filter((request) => (!filters.repositoryId || request.repositoryId === filters.repositoryId) && (filters.state === 'all' || request.state === filters.state))
      .map(toSummary)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async getReviewRequest(id, workspaceId) {
    await simulateMockLoading()
    const request = readStore()[workspaceId]?.requests.find((item) => item.id === id)
    if (!request) throw new Error('This pull request could not be found. It may have been removed when GitHub was disconnected.')
    return request
  },
}

function toSummary(detail: ReviewRequestDetail): ReviewRequest {
  const { files, ...summary } = detail
  void files
  return summary
}

function withOpenCounts(record: MockWorkspaceRecord): RepositoryConnection {
  return {
    ...record.connection,
    repositories: record.connection.repositories.map((repository) => ({
      ...repository,
      openRequestCount: record.requests.filter((request) => request.repositoryId === repository.id && request.state === 'open').length,
    })),
  }
}

function requireAdmin(workspaceId: string) {
  const access = getMockWorkspaceAccess(workspaceId)
  if (!access.user || !access.role) throw new Error('You are not an active member of this workspace.')
  if (access.role !== 'admin') throw new Error('Only workspace admins can manage the GitHub connection.')
}

function readStore(): MockStore {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MockStore : {}
  } catch { return {} }
}

function writeStore(store: MockStore) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(store)) }
  catch { throw new Error('Your browser could not save local data. Check its storage settings and try again.') }
}
