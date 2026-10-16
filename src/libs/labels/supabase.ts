import { supabase } from '@/libs/supabase'
import type { LabelRepository, PolicyLabel } from './types'

export const supabaseLabelRepository: LabelRepository = {
  async list() {
    const { data, error } = await supabase!.from('policy_labels').select('id, name, owner_id, created_by, created_at').order('name')
    if (error) throw error
    return (data ?? []).map((row) => ({ id: row.id, name: row.name, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? '', createdAt: row.created_at }))
  },
  async create(name, ownerId, createdBy) {
    const { data, error } = await supabase!.from('policy_labels').insert({ name, owner_id: ownerId, created_by: createdBy }).select('id, name, owner_id, created_by, created_at').single()
    if (error) throw error
    const row = data as unknown as { id: string; name: string; owner_id: string | null; created_by: string | null; created_at: string }
    const label: PolicyLabel = { id: row.id, name: row.name, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? '', createdAt: row.created_at }
    return label
  },
  async update(id, name) {
    const existing = await getLabel(id)
    const { data: policies, error: listError } = await supabase!.from('policies').select('id, labels').eq('owner_id', existing.ownerId)
    if (listError) throw listError
    for (const policy of policies ?? []) {
      const labels = (policy.labels ?? []) as string[]
      if (labels.includes(existing.name)) {
        const { error } = await supabase!.from('policies').update({ labels: labels.map((label) => label === existing.name ? name : label) }).eq('id', policy.id)
        if (error) throw error
      }
    }
    const { data, error } = await supabase!.from('policy_labels').update({ name }).eq('id', id).select('id, name, owner_id, created_by, created_at').single()
    if (error) throw error
    const row = data as unknown as { id: string; name: string; owner_id: string | null; created_by: string | null; created_at: string }
    return { id: row.id, name: row.name, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? '', createdAt: row.created_at }
  },
  async delete(id) {
    const existing = await getLabel(id)
    const { data: policies, error: listError } = await supabase!.from('policies').select('id, labels').eq('owner_id', existing.ownerId)
    if (listError) throw listError
    for (const policy of policies ?? []) {
      const labels = (policy.labels ?? []) as string[]
      if (labels.includes(existing.name)) {
        const { error } = await supabase!.from('policies').update({ labels: labels.filter((label) => label !== existing.name) }).eq('id', policy.id)
        if (error) throw error
      }
    }
    const { error } = await supabase!.from('policy_labels').delete().eq('id', id)
    if (error) throw error
  },
}

async function getLabel(id: string) {
  const { data, error } = await supabase!.from('policy_labels').select('id, name, owner_id, created_by, created_at').eq('id', id).single()
  if (error) throw error
  const row = data as unknown as { id: string; name: string; owner_id: string | null; created_by: string | null; created_at: string }
  return { id: row.id, name: row.name, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? '', createdAt: row.created_at }
}
