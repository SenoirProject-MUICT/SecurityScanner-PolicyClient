import type { Policy, PolicyActivity, PolicyActivityType, PolicyRepository } from './types'
import { supabase } from '@/libs/supabase'
import type { Tables } from '@/libs/supabase/database.types'

const fields = 'id, workspace_id, name, description, labels, status, effective_from, effective_until, owner_id, created_by, created_at, updated_at' as const

export const supabasePolicyRepository: PolicyRepository = {
  async list(workspaceId) {
    const { data, error } = await supabase!.from('policies').select(fields).eq('workspace_id', workspaceId).order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapSupabasePolicy)
  },
  async create(input) {
    const { data, error } = await supabase!.from('policies').insert({
      name: input.name, description: input.description, labels: input.labels,
      status: input.status, effective_from: input.effectiveFrom, effective_until: input.effectiveUntil,
      workspace_id: input.workspaceId, owner_id: input.ownerId, created_by: input.createdBy,
    }).select(fields).single()
    if (error) throw error
    return mapSupabasePolicy(data)
  },
  async update(id, input) {
    const { data, error } = await supabase!.from('policies').update({
      name: input.name, description: input.description, labels: input.labels,
      status: input.status, effective_from: input.effectiveFrom, effective_until: input.effectiveUntil, updated_at: new Date().toISOString(),
    }).eq('id', id).eq('workspace_id', input.workspaceId).select(fields).single()
    if (error) throw error
    return mapSupabasePolicy(data)
  },
  async delete(id, workspaceId) {
    const { error } = await supabase!.from('policies').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) throw error
  },
  async setStatus(id, status, workspaceId) {
    const { data, error } = await supabase!.from('policies').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', workspaceId).select(fields).single()
    if (error) throw error
    return mapSupabasePolicy(data)
  },
  async listActivity(workspaceId) {
    const { data, error } = await supabase!.from('policy_activity').select('id, workspace_id, policy_id, policy_name, activity_type, occurred_at').eq('workspace_id', workspaceId).order('occurred_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => ({ id: row.id, workspaceId: row.workspace_id, policyId: row.policy_id, policyName: row.policy_name, type: row.activity_type as PolicyActivityType, occurredAt: row.occurred_at })) satisfies PolicyActivity[]
  },
  async recordActivity(policy, type, ownerId) {
    const { error } = await supabase!.from('policy_activity').insert({ workspace_id: policy.workspaceId, owner_id: ownerId, policy_id: policy.id, policy_name: policy.name, activity_type: type })
    if (error) throw error
  },
}

function mapSupabasePolicy(row: Tables<'policies'>): Policy {
  const status = row.status === 'draft' || row.status === 'inactive' ? row.status : 'active'
  return {
    id: row.id, workspaceId: row.workspace_id, name: row.name, description: row.description ?? '', labels: row.labels ?? [], status,
    effectiveFrom: row.effective_from, effectiveUntil: row.effective_until, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? 'Unknown member',
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}
