import { supabase } from '@/libs/supabase'
import type { LabelRepository, PolicyLabel } from './types'

export const supabaseLabelRepository: LabelRepository = {
  async list(workspaceId) {
    const { data, error } = await supabase!.from('policy_labels').select('id, workspace_id, name, owner_id, created_by, created_at').eq('workspace_id', workspaceId).order('name')
    if (error) throw error
    return (data ?? []).map((row) => ({ id: row.id, workspaceId: row.workspace_id, name: row.name, ownerId: row.owner_id ?? '', createdBy: row.created_by ?? '', createdAt: row.created_at }))
  },
  async create(name, ownerId, createdBy, workspaceId) {
    const { data, error } = await supabase!.from('policy_labels').insert({ name, workspace_id: workspaceId, owner_id: ownerId, created_by: createdBy }).select('id, workspace_id, name, owner_id, created_by, created_at').single()
    if (error) throw error
    const label: PolicyLabel = { id: data.id, workspaceId: data.workspace_id, name: data.name, ownerId: data.owner_id ?? '', createdBy: data.created_by, createdAt: data.created_at }
    return label
  },
  async update(id, name, workspaceId) {
    const existing = await getLabel(id, workspaceId)
    const { data: policies, error: listError } = await supabase!.from('policies').select('id, labels').eq('workspace_id', workspaceId)
    if (listError) throw listError
    for (const policy of policies ?? []) {
      const labels = (policy.labels ?? []) as string[]
      if (labels.includes(existing.name)) {
        const { error } = await supabase!.from('policies').update({ labels: labels.map((label) => label === existing.name ? name : label) }).eq('id', policy.id).eq('workspace_id', workspaceId)
        if (error) throw error
      }
    }
    const { data, error } = await supabase!.from('policy_labels').update({ name }).eq('id', id).eq('workspace_id', workspaceId).select('id, workspace_id, name, owner_id, created_by, created_at').single()
    if (error) throw error
    return { id: data.id, workspaceId: data.workspace_id, name: data.name, ownerId: data.owner_id ?? '', createdBy: data.created_by, createdAt: data.created_at }
  },
  async delete(id, workspaceId) {
    const existing = await getLabel(id, workspaceId)
    const { data: policies, error: listError } = await supabase!.from('policies').select('id, labels').eq('workspace_id', workspaceId)
    if (listError) throw listError
    for (const policy of policies ?? []) {
      const labels = (policy.labels ?? []) as string[]
      if (labels.includes(existing.name)) {
        const { error } = await supabase!.from('policies').update({ labels: labels.filter((label) => label !== existing.name) }).eq('id', policy.id).eq('workspace_id', workspaceId)
        if (error) throw error
      }
    }
    const { error } = await supabase!.from('policy_labels').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) throw error
  },
}

async function getLabel(id: string, workspaceId: string) {
  const { data, error } = await supabase!.from('policy_labels').select('id, workspace_id, name, owner_id, created_by, created_at').eq('id', id).eq('workspace_id', workspaceId).single()
  if (error) throw error
  return { id: data.id, workspaceId: data.workspace_id, name: data.name, ownerId: data.owner_id ?? '', createdBy: data.created_by, createdAt: data.created_at }
}
