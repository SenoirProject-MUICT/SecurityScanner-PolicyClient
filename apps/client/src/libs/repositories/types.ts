export type RepositoryProvider = 'github'
export type RepositorySyncStatus = 'idle' | 'syncing' | 'succeeded' | 'failed'
export type RepositoryConnectionStatus = 'active' | 'suspended'

export type ConnectedRepository = {
  id: string
  connectionId: string
  provider: RepositoryProvider
  owner: string
  name: string
  fullName: string
  url: string
  defaultBranch: string
  isPrivate: boolean
  /** Only linked repositories have their pull requests imported. */
  isLinked: boolean
  syncStatus: RepositorySyncStatus
  syncError: string | null
  lastSyncedAt: string | null
  openRequestCount: number
}

export type RepositoryConnection = {
  id: string
  workspaceId: string
  provider: RepositoryProvider
  installationId: number
  accountLogin: string
  accountType: 'User' | 'Organization'
  status: RepositoryConnectionStatus
  connectedAt: string
  /** GitHub's page for choosing which repositories the App can see. */
  manageUrl: string
  /** Every repository the App can see, linked or not. */
  repositories: ConnectedRepository[]
}

export type ReviewRequestState = 'open' | 'closed' | 'merged'
export type ReviewRequestStateFilter = ReviewRequestState | 'all'
export type ChangedFileStatus = 'added' | 'modified' | 'removed' | 'renamed'

export type ChangedFileSummary = {
  added: number
  modified: number
  removed: number
  renamed: number
  additions: number
  deletions: number
  total: number
}

export type ReviewRequest = {
  id: string
  workspaceId: string
  repositoryId: string
  repositoryFullName: string
  provider: RepositoryProvider
  number: number
  title: string
  description: string
  url: string
  state: ReviewRequestState
  isDraft: boolean
  author: { login: string; avatarUrl: string | null }
  sourceBranch: string
  targetBranch: string
  headSha: string
  baseSha: string
  fileSummary: ChangedFileSummary
  createdAt: string
  updatedAt: string
  closedAt: string | null
  mergedAt: string | null
  lastSyncedAt: string
}

export type ChangedFile = {
  id: string
  path: string
  previousPath: string | null
  status: ChangedFileStatus
  additions: number
  deletions: number
  changes: number
  /** GitHub omits the patch for binary and very large files. */
  patch: string | null
}

export type ReviewRequestDetail = ReviewRequest & { files: ChangedFile[] }

export type ReviewRequestFilters = { repositoryId: string | null; state: ReviewRequestStateFilter }

/** Api mode sends the browser to GitHub's install screen; mock mode connects without leaving the app. */
export type ConnectResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'connected'; connection: RepositoryConnection }

export type RepositoryIntegrationRepository = {
  listConnections(workspaceId: string): Promise<RepositoryConnection[]>
  connect(workspaceId: string): Promise<ConnectResult>
  sync(connectionId: string, workspaceId: string): Promise<RepositoryConnection>
  /** Replaces the linked set: repositories left out are unlinked and their imported pull requests removed. */
  setLinkedRepositories(connectionId: string, workspaceId: string, repositoryIds: string[]): Promise<RepositoryConnection>
  disconnect(connectionId: string, workspaceId: string): Promise<void>
  listReviewRequests(workspaceId: string, filters: ReviewRequestFilters): Promise<ReviewRequest[]>
  getReviewRequest(id: string, workspaceId: string): Promise<ReviewRequestDetail>
}
