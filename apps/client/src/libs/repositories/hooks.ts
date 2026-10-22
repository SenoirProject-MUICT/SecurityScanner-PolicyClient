import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { repositoryMutationKeys, repositoryQueryKeys } from './query-keys'
import { connectGithub, disconnectRepositoryConnection, getReviewRequest, listRepositoryConnections, listReviewRequests, setLinkedRepositories, syncRepositoryConnection, type RepositoryConnection, type ReviewRequestFilters } from './index'

const IMPORT_POLL_MS = 3000
const IMPORT_WINDOW_MS = 2 * 60 * 1000

function errorMessage(error: unknown) { return error instanceof Error ? error.message : '' }

function isImporting(connection: RepositoryConnection) {
  if (connection.repositories.some((repo) => repo.syncStatus === 'syncing')) return true
  return connection.repositories.length === 0 && Date.now() - Date.parse(connection.connectedAt) < IMPORT_WINDOW_MS
}

/** `watchAccess` keeps the list fresh while an admin may be changing the App's repository access on GitHub in another tab. */
export function useRepositoryConnections({ watchAccess = false }: { watchAccess?: boolean } = {}) {
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const query = useQuery({
    queryKey: repositoryQueryKeys.connections(workspaceId),
    queryFn: () => listRepositoryConnections(workspaceId),
    enabled: Boolean(workspaceId),
    // Imports run on the server after connecting or linking, so keep polling until they settle.
    refetchInterval: (current) => watchAccess || current.state.data?.some(isImporting) ? IMPORT_POLL_MS : false,
    refetchOnWindowFocus: watchAccess ? 'always' : false,
  })
  return {
    connections: query.data ?? [],
    isLoading: Boolean(workspaceId) && query.isPending,
    error: errorMessage(query.error),
  }
}

export function useRepositoryConnectionActions() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: repositoryQueryKeys.connections(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: repositoryQueryKeys.allReviewRequests(workspaceId) }),
  ])
  const connectMutation = useMutation({
    mutationKey: repositoryMutationKeys.connect(workspaceId),
    mutationFn: () => {
      if (!workspaceId) throw new Error('Choose a workspace before connecting GitHub.')
      return connectGithub(workspaceId)
    },
    onSuccess: refresh,
  })
  const syncMutation = useMutation({
    mutationKey: repositoryMutationKeys.sync(workspaceId),
    mutationFn: (connectionId: string) => syncRepositoryConnection(connectionId, workspaceId),
    onSettled: refresh,
  })
  const linkMutation = useMutation({
    mutationKey: repositoryMutationKeys.link(workspaceId),
    mutationFn: ({ connectionId, repositoryIds }: { connectionId: string; repositoryIds: string[] }) => setLinkedRepositories(connectionId, workspaceId, repositoryIds),
    onSettled: refresh,
  })
  const disconnectMutation = useMutation({
    mutationKey: repositoryMutationKeys.disconnect(workspaceId),
    mutationFn: (connectionId: string) => disconnectRepositoryConnection(connectionId, workspaceId),
    onSuccess: refresh,
  })
  return {
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    sync: syncMutation.mutateAsync,
    syncingConnectionId: syncMutation.isPending ? syncMutation.variables : null,
    setLinkedRepositories: linkMutation.mutateAsync,
    isLinking: linkMutation.isPending,
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
  }
}

export function useReviewRequests(filters: ReviewRequestFilters) {
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const query = useQuery({
    queryKey: repositoryQueryKeys.reviewRequests(workspaceId, filters),
    queryFn: () => listReviewRequests(workspaceId, filters),
    enabled: Boolean(workspaceId),
  })
  return {
    requests: query.data ?? [],
    isLoading: Boolean(workspaceId) && query.isPending,
    error: errorMessage(query.error),
  }
}

export function useReviewRequest(id: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const query = useQuery({
    queryKey: repositoryQueryKeys.reviewRequest(workspaceId, id ?? ''),
    queryFn: () => getReviewRequest(id!, workspaceId),
    enabled: Boolean(workspaceId && id),
  })
  return {
    request: query.data ?? null,
    isLoading: Boolean(workspaceId && id) && query.isPending,
    error: errorMessage(query.error),
  }
}
