import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { policyMutationKeys, policyQueryKeys } from './query-keys'
import { approvePolicy, createPolicy, deletePolicy, listPolicies, listPolicyActivity, listPolicyHistory, recordPolicyActivity, rejectPolicy, setPolicyStatus, submitPolicy, updatePolicy, type Policy, type PolicyActivityType, type PolicyDraftInput, type PolicyToggleStatus } from './index'

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
  const refreshActivity = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: policyQueryKeys.activity(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: policyQueryKeys.allHistory(workspaceId) }),
  ])

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
    mutationFn: async ({ id, status }: { id: string; status: PolicyToggleStatus }) => {
      if (!workspaceId) throw new Error('Choose a workspace before changing policy status.')
      const policy = await setPolicyStatus(id, status, workspaceId)
      if (isScheduled(policy)) await recordActivity(policy, 'scheduled')
      return policy
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) }), refreshActivity()]) },
  })
  const submitMutation = useMutation({
    mutationKey: policyMutationKeys.submit(workspaceId),
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      if (!workspaceId) throw new Error('Choose a workspace before submitting a policy.')
      return submitPolicy(id, workspaceId, note)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: policyQueryKeys.list(workspaceId) }), refreshActivity()]) },
  })
  const reviewMutation = useMutation({
    mutationKey: policyMutationKeys.review(workspaceId),
    mutationFn: async ({ id, decision, note }: { id: string; decision: 'approve' | 'reject'; note: string }) => {
      if (!workspaceId) throw new Error('Choose a workspace before reviewing a policy.')
      if (decision === 'reject') return rejectPolicy(id, workspaceId, note)
      const policy = await approvePolicy(id, workspaceId, note)
      if (isScheduled(policy)) await recordActivity(policy, 'scheduled')
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
    setStatus: (id: string, status: PolicyToggleStatus) => statusMutation.mutateAsync({ id, status }),
    isStatusUpdating: statusMutation.isPending,
    statusUpdatingPolicyId: statusMutation.variables?.id ?? null,
    submit: (id: string, note = '') => submitMutation.mutateAsync({ id, note }),
    approve: (id: string, note = '') => reviewMutation.mutateAsync({ id, decision: 'approve', note }),
    reject: (id: string, note: string) => reviewMutation.mutateAsync({ id, decision: 'reject', note }),
    isWorkflowUpdating: submitMutation.isPending || reviewMutation.isPending,
  }
}

export function usePolicyHistory(policyId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const historyQuery = useQuery({
    queryKey: policyQueryKeys.history(workspaceId, policyId ?? ''),
    queryFn: () => listPolicyHistory(policyId!, workspaceId),
    enabled: Boolean(workspaceId && policyId),
  })
  return {
    events: historyQuery.data ?? [],
    isLoading: Boolean(workspaceId && policyId) && historyQuery.isPending,
    error: historyQuery.error instanceof Error ? historyQuery.error.message : '',
  }
}

function isScheduled(policy: Policy) { return policy.status === 'active' && Boolean(policy.effectiveFrom && policy.effectiveFrom > new Date().toISOString().slice(0, 10)) }
