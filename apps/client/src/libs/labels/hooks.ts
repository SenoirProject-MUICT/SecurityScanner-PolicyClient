import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { labelMutationKeys, labelQueryKeys } from './query-keys'
import { policyQueryKeys } from '@/libs/policies/query-keys'
import { listPolicies } from '@/libs/policies'
import { createLabel, deleteLabel, listLabels, updateLabel } from './index'

export function useLabels() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const { user } = useAuth()
  const labelsQuery = useQuery({ queryKey: labelQueryKeys.list(workspaceId), queryFn: () => listLabels(workspaceId), enabled: Boolean(workspaceId) })
  const policiesQuery = useQuery({ queryKey: policyQueryKeys.list(workspaceId), queryFn: () => listPolicies(workspaceId), enabled: Boolean(workspaceId) })

  const createMutation = useMutation({
    mutationKey: labelMutationKeys.create(workspaceId),
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Sign in before creating a label.')
      if (!workspaceId) throw new Error('Choose a workspace before creating a label.')
      return createLabel(name, user.id, user.name, workspaceId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labelQueryKeys.list(workspaceId) }),
  })
  const updateMutation = useMutation({
    mutationKey: labelMutationKeys.update(workspaceId),
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!workspaceId) throw new Error('Choose a workspace before updating a label.')
      return updateLabel(id, name, workspaceId)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: labelQueryKeys.list(workspaceId) }), queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) })]) },
  })
  const removeMutation = useMutation({
    mutationKey: labelMutationKeys.remove(workspaceId),
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error('Choose a workspace before removing a label.')
      return deleteLabel(id, workspaceId)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: labelQueryKeys.list(workspaceId) }), queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) })]) },
  })

  const labelRecords = [...(labelsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const labels = [...new Set([...labelRecords.map((label) => label.name), ...(policiesQuery.data ?? []).flatMap((policy) => policy.labels)])].sort((a, b) => a.localeCompare(b))
  return {
    labelRecords,
    labels,
    isLoading: Boolean(workspaceId) && labelsQuery.isPending,
    create: createMutation.mutateAsync,
    update: (id: string, name: string) => updateMutation.mutateAsync({ id, name }),
    remove: removeMutation.mutateAsync,
  }
}
