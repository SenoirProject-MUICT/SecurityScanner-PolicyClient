import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { policyMutationKeys, policyQueryKeys } from './query-keys'
import { createPolicy, deletePolicy, listPolicies, listPolicyActivity, recordPolicyActivity, setPolicyStatus, updatePolicy, type Policy, type PolicyActivityType, type PolicyDraftInput, type PolicyStatus } from './index'

export function usePolicies() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const { user } = useAuth()
  const policiesQuery = useQuery({
    queryKey: policyQueryKeys.list(workspaceId),
    queryFn: () => listPolicies(workspaceId),
    enabled: Boolean(workspaceId),
    select: (policies) => [...policies].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  })
  const activityQuery = useQuery({
    queryKey: policyQueryKeys.activity(workspaceId),
    queryFn: () => listPolicyActivity(workspaceId),
    enabled: Boolean(workspaceId),
  })

  const recordActivity = async (policy: Pick<Policy, 'id' | 'name' | 'workspaceId'>, type: PolicyActivityType) => {
    if (!user) return
    try { await recordPolicyActivity(policy, type, user.id) } catch { /* Activity history must not block a policy change. */ }
  }
  const refreshActivity = () => queryClient.invalidateQueries({ queryKey: policyQueryKeys.activity(workspaceId) })

  const createMutation = useMutation({
    mutationKey: policyMutationKeys.create(workspaceId),
    mutationFn: async (input: PolicyDraftInput) => {
      if (!user) throw new Error('Sign in before creating a policy.')
      if (!workspaceId) throw new Error('Choose a workspace before creating a policy.')
      const policy = await createPolicy({ ...input, workspaceId, ownerId: user.id, createdBy: user.name })
      await recordActivity(policy, 'added')
      if (policy.status === 'draft') await recordActivity(policy, 'draft')
      else if (isScheduled(policy)) await recordActivity(policy, 'scheduled')
      return policy
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) }), refreshActivity()]) },
  })
  const updateMutation = useMutation({
    mutationKey: policyMutationKeys.update(workspaceId),
    mutationFn: async ({ id, input }: { id: string; input: PolicyDraftInput }) => {
      if (!user) throw new Error('Sign in before updating a policy.')
      if (!workspaceId) throw new Error('Choose a workspace before updating a policy.')
      const policy = await updatePolicy(id, { ...input, workspaceId, ownerId: user.id, createdBy: user.name })
      if (policy.status === 'draft') await recordActivity(policy, 'draft')
      else if (isScheduled(policy)) await recordActivity(policy, 'scheduled')
      return policy
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) }), refreshActivity()]) },
  })
  const removeMutation = useMutation({
    mutationKey: policyMutationKeys.remove(workspaceId),
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error('Choose a workspace before removing a policy.')
      const removed = policiesQuery.data?.find((policy) => policy.id === id)
      await deletePolicy(id, workspaceId)
      if (removed) await recordActivity(removed, 'removed')
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) }), refreshActivity()]) },
  })
  const statusMutation = useMutation({
    mutationKey: policyMutationKeys.setStatus(workspaceId),
    mutationFn: async ({ id, status }: { id: string; status: PolicyStatus }) => {
      if (!workspaceId) throw new Error('Choose a workspace before changing policy status.')
      const policy = await setPolicyStatus(id, status, workspaceId)
      if (policy.status === 'draft') await recordActivity(policy, 'draft')
      else if (isScheduled(policy)) await recordActivity(policy, 'scheduled')
      return policy
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) }), refreshActivity()]) },
  })

  return {
    policies: policiesQuery.data ?? [],
    activity: activityQuery.data ?? [],
    isLoading: Boolean(workspaceId) && policiesQuery.isPending,
    error: policiesQuery.error instanceof Error ? policiesQuery.error.message : '',
    create: createMutation.mutateAsync,
    update: (id: string, input: PolicyDraftInput) => updateMutation.mutateAsync({ id, input }),
    remove: removeMutation.mutateAsync,
    setStatus: (id: string, status: PolicyStatus) => statusMutation.mutateAsync({ id, status }),
    isStatusUpdating: statusMutation.isPending,
    statusUpdatingPolicyId: statusMutation.variables?.id ?? null,
  }
}

function isScheduled(policy: Policy) { return policy.status === 'active' && Boolean(policy.effectiveFrom && policy.effectiveFrom > new Date().toISOString().slice(0, 10)) }
