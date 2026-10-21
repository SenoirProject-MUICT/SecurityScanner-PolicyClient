import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workspaceMutationKeys, workspaceQueryKeys } from './query-keys'
import { useAuth } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { createWorkspace, deleteWorkspace, inviteWorkspaceMember, joinWorkspace, listWorkspaceJoinCodes, listWorkspaceMembers, listWorkspaces, removeWorkspaceMember, revokeWorkspaceJoinCode, setWorkspaceMemberRole, setWorkspaceMemberStatus, createWorkspaceJoinCode, revealWorkspaceJoinCode, updateWorkspace, type WorkspaceMemberStatus, type WorkspaceRole } from './index'
import { WorkspaceAccessDeniedError } from './errors'

const WORKSPACE_QUERY_RETRY_LIMIT = 2

export function useWorkspaces() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace)
  const enterWorkspace = useWorkspaceStore((state) => state.enterWorkspace)
  const leaveWorkspace = useWorkspaceStore((state) => state.leaveWorkspace)
  const resetSelection = useWorkspaceStore((state) => state.resetSelection)
  const workspacesQuery = useQuery({
    queryKey: workspaceQueryKeys.list(user?.id ?? ''),
    queryFn: () => listWorkspaces(user!),
    enabled: Boolean(user),
    // Access denial and setup errors are actionable states. Do not keep the
    // protected shell on its loading screen while retrying them in the
    // background; the user can explicitly check again from the recovery page.
    retry: (failureCount, error) => !(error instanceof WorkspaceAccessDeniedError) && failureCount < WORKSPACE_QUERY_RETRY_LIMIT,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  useEffect(() => {
    const rows = workspacesQuery.data
    if (!rows) return
    if (!rows.some((row) => row.id === selectedWorkspaceId)) selectWorkspace(rows.find((row) => row.isDefault)?.id ?? rows[0]?.id ?? '')
  }, [workspacesQuery.data, selectedWorkspaceId, selectWorkspace])

  const createMutation = useMutation({ mutationKey: workspaceMutationKeys.create(), mutationFn: createWorkspace, onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list(user?.id ?? '') }) })
  const joinMutation = useMutation({ mutationKey: workspaceMutationKeys.join(), mutationFn: joinWorkspace, onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list(user?.id ?? '') }) })
  const updateMutation = useMutation({ mutationKey: workspaceMutationKeys.update(), mutationFn: ({ workspaceId, name }: { workspaceId: string; name: string }) => updateWorkspace(workspaceId, name), onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list(user?.id ?? '') }) })
  const deleteMutation = useMutation({
    mutationKey: workspaceMutationKeys.delete(),
    mutationFn: async (workspaceId: string) => {
      await deleteWorkspace(workspaceId)
      return workspaceId
    },
    onSuccess: async (workspaceId) => {
      if (selectedWorkspaceId === workspaceId) {
        leaveWorkspace()
        resetSelection()
      }
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.list(user?.id ?? '') })
    },
  })

  return {
    workspaces: workspacesQuery.data ?? [],
    selectedWorkspaceId,
    selectWorkspace,
    enterWorkspace,
    isLoading: Boolean(user) && workspacesQuery.isPending,
    error: workspacesQuery.error instanceof Error ? workspacesQuery.error.message : '',
    accessDenied: workspacesQuery.error instanceof WorkspaceAccessDeniedError,
    refetch: workspacesQuery.refetch,
    createWorkspace: createMutation.mutateAsync,
    joinWorkspace: joinMutation.mutateAsync,
    updateWorkspace: (workspaceId: string, name: string) => updateMutation.mutateAsync({ workspaceId, name }),
    deleteWorkspace: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || joinMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  }
}

export function useWorkspaceMembers() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const membersQuery = useQuery({ queryKey: workspaceQueryKeys.members(workspaceId), queryFn: () => listWorkspaceMembers(workspaceId), enabled: Boolean(workspaceId) })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.members(workspaceId) })
  const inviteMutation = useMutation({ mutationKey: workspaceMutationKeys.invite(workspaceId), mutationFn: ({ email, role }: { email: string; role: WorkspaceRole }) => inviteWorkspaceMember(workspaceId, email, role), onSuccess: invalidate })
  const roleMutation = useMutation({ mutationKey: workspaceMutationKeys.changeRole(workspaceId), mutationFn: ({ memberId, role }: { memberId: string; role: WorkspaceRole }) => setWorkspaceMemberRole(workspaceId, memberId, role), onSuccess: invalidate })
  const statusMutation = useMutation({ mutationKey: workspaceMutationKeys.changeStatus(workspaceId), mutationFn: ({ memberId, status }: { memberId: string; status: Exclude<WorkspaceMemberStatus, 'invited'> }) => setWorkspaceMemberStatus(workspaceId, memberId, status), onSuccess: invalidate })
  const removeMutation = useMutation({ mutationKey: workspaceMutationKeys.removeMember(workspaceId), mutationFn: removeWorkspaceMember.bind(null, workspaceId), onSuccess: invalidate })
  return {
    members: membersQuery.data?.members ?? [],
    canManage: membersQuery.data?.canManage ?? false,
    isLoading: Boolean(workspaceId) && membersQuery.isPending,
    error: membersQuery.error instanceof Error ? membersQuery.error.message : '',
    invite: (email: string, role: WorkspaceRole) => inviteMutation.mutateAsync({ email, role }),
    changeRole: (memberId: string, role: WorkspaceRole) => roleMutation.mutateAsync({ memberId, role }),
    changeStatus: (memberId: string, status: Exclude<WorkspaceMemberStatus, 'invited'>) => statusMutation.mutateAsync({ memberId, status }),
    remove: removeMutation.mutateAsync,
    isMutating: inviteMutation.isPending || roleMutation.isPending || statusMutation.isPending || removeMutation.isPending,
  }
}

export function useWorkspaceJoinCodes() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const { canManage } = useWorkspaceMembers()
  const codesQuery = useQuery({ queryKey: workspaceQueryKeys.joinCodes(workspaceId), queryFn: () => listWorkspaceJoinCodes(workspaceId), enabled: Boolean(workspaceId) && canManage })
  const createMutation = useMutation({ mutationKey: workspaceMutationKeys.createJoinCode(workspaceId), mutationFn: (days: number) => createWorkspaceJoinCode(workspaceId, days), onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.joinCodes(workspaceId) }) })
  const revealMutation = useMutation({ mutationKey: workspaceMutationKeys.revealJoinCode(workspaceId), mutationFn: (codeId: string) => revealWorkspaceJoinCode(workspaceId, codeId) })
  const revokeMutation = useMutation({ mutationKey: workspaceMutationKeys.revokeJoinCode(workspaceId), mutationFn: revokeWorkspaceJoinCode.bind(null, workspaceId), onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.joinCodes(workspaceId) }) })
  return { codes: codesQuery.data ?? [], isLoading: codesQuery.isPending, error: codesQuery.error instanceof Error ? codesQuery.error.message : '', create: createMutation.mutateAsync, reveal: revealMutation.mutateAsync, isRevealing: revealMutation.isPending, revealingCodeId: revealMutation.variables, revoke: revokeMutation.mutateAsync, isMutating: createMutation.isPending || revokeMutation.isPending }
}

export function useIsWorkspaceAdmin() {
  const { workspaces, selectedWorkspaceId, isLoading } = useWorkspaces()
  return { isAdmin: workspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.role === 'admin', isLoading }
}
