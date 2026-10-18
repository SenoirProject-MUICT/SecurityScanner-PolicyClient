import type { Policy, PolicyActivity, PolicyActivityType, PolicyRepository } from './types'
import { supabase } from '@/libs/supabase'

const fields = 'id, name, description, labels, status, effective_from, effective_until, owner_id, created_by, created_at, updated_at'

export const supabasePolicyRepository: PolicyRepository = {
  async list() {
    const { data, error } = await supabase!.from('policies').select(fields).order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapSupabasePolicy)
  },
  async create(input) {
    const { data, error } = await supabase!.from('policies').insert({
      name: input.name, description: input.description, labels: input.labels,
      status: input.status, effective_from: input.effectiveFrom, effective_until: input.effectiveUntil,
      owner_id: input.ownerId, created_by: input.createdBy,
    }).select(fields).single()
    if (error) throw error
    return mapSupabasePolicy(data)
  },
  async update(id, input) {
    const { data, error } = await supabase!.from('policies').update({
      name: input.name, description: input.description, labels: input.labels,
      status: input.status, effective_from: input.effectiveFrom, effective_until: input.effectiveUntil, updated_at: new Date().toISOString(),
    }).eq('id', id).select(fields).single()
    if (error) throw error
    return mapSupabasePolicy(data)
  },
  async delete(id) {
    const { error } = await supabase!.from('policies').delete().eq('id', id)
    if (error) throw error
  },
  async setStatus(id, status) {
    const { data, error } = await supabase!.from('policies').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select(fields).single()
    if (error) throw error
    return mapSupabasePolicy(data)
  },
  async listActivity() {
    const { data, error } = await supabase!.from('policy_activity').select('id, policy_id, policy_name, activity_type, occurred_at').order('occurred_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => ({ id: row.id, policyId: row.policy_id, policyName: row.policy_name, type: row.activity_type as PolicyActivityType, occurredAt: row.occurred_at })) satisfies PolicyActivity[]
  },
  async recordActivity(policy, type) {
    const { error } = await supabase!.from('policy_activity').insert({ policy_id: policy.id, policy_name: policy.name, activity_type: type })
    if (error) throw error
  },
}

type PolicyRow = { id: string; name: string; description: string | null; labels: string[] | null; status: string | null; effective_from: string | null; effective_until: string | null; owner_id: string | null; created_by: string | null; created_at: string; updated_at: string }
function mapSupabasePolicy(row: PolicyRow): Policy {
  const status = row.status === 'draft' || row.status === 'inactive' ? row.status : 'active'
  return {
    id: row.id, name: row.name, description: row.description ?? '', labels: row.labels ?? [], status,
    effectiveFrom: row.effective_from, effectiveUntil: row.effective_until, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? 'Unknown member',
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}
