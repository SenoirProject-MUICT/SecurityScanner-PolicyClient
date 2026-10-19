import type { LabelRepository, PolicyLabel } from './types'
import { simulateMockLoading } from '@/libs/mock-delay'
import { getMockWorkspaceId } from '@/libs/workspaces/mock'
import { BRAND } from '@/constants/brand'

const storageKey = 'policy-desk.labels.v1'
const defaults = ['Engineering', 'Security', 'Product', 'Operations'].map((name, index) => ({
  id: `default-label-${index}`, workspaceId: getMockWorkspaceId('mock-demo-user'), name, ownerId: 'mock-demo-user', createdBy: BRAND.name, createdAt: new Date(0).toISOString(),
}))

export const mockLabelRepository: LabelRepository = {
  async list(workspaceId) {
    await simulateMockLoading()
    const labels = readLabels()
    const scoped = labels.filter((label) => label.workspaceId === workspaceId)
    if (!scoped.length) {
      const seeded = defaults.map((label) => ({ ...label, id: `${label.id}-${workspaceId}`, workspaceId }))
      saveLabels([...labels, ...seeded])
      return seeded
    }
    return scoped
  },
  async create(name, ownerId, createdBy, workspaceId) {
    const current = readLabels().filter((label) => label.workspaceId === workspaceId)
    if (current.some((label) => label.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A label with this name already exists.')
    const label: PolicyLabel = { id: crypto.randomUUID(), workspaceId, name, ownerId, createdBy, createdAt: new Date().toISOString() }
    saveLabels([...readLabels(), label])
    return label
  },
  async update(id, name, workspaceId) {
    const current = readLabels()
    const existing = current.find((label) => label.id === id && label.workspaceId === workspaceId)
    if (!existing) throw new Error('This label no longer exists.')
    if (current.some((label) => label.id !== id && label.workspaceId === workspaceId && label.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('A label with this name already exists.')
    const updated = { ...existing, name }
    updateStoredPolicies(existing.name, name, workspaceId)
    saveLabels(current.map((label) => label.id === id ? updated : label))
    return updated
  },
  async delete(id, workspaceId) {
    const current = readLabels()
    const existing = current.find((label) => label.id === id && label.workspaceId === workspaceId)
    if (!existing) return
    updateStoredPolicies(existing.name, undefined, workspaceId)
    saveLabels(current.filter((label) => label.id !== id))
  },
}

function updateStoredPolicies(oldName: string, newName: string | undefined, workspaceId: string) {
  for (const key of ['policy-desk.policies.v2', 'policy-desk.policies.v1']) {
    try {
      const stored = window.localStorage.getItem(key)
      if (!stored) continue
      const policies: unknown = JSON.parse(stored)
      if (!Array.isArray(policies)) continue
      const updated = policies.map((policy) => {
        if (!policy || typeof policy !== 'object') return policy
        const row = policy as { labels?: unknown; workspaceId?: string; ownerId?: string }
        const policyWorkspaceId = row.workspaceId ?? getMockWorkspaceId(row.ownerId ?? 'mock-demo-user')
        if (policyWorkspaceId !== workspaceId || !Array.isArray(row.labels) || !row.labels.includes(oldName)) return policy
        return { ...row, labels: newName ? row.labels.map((label) => label === oldName ? newName : label) : row.labels.filter((label) => label !== oldName) }
      })
      window.localStorage.setItem(key, JSON.stringify(updated))
    } catch { throw new Error('Could not update policies that use this label. Try again.') }
  }
}

function readLabels(): PolicyLabel[] {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) { saveLabels(defaults); return defaults }
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? (parsed as Partial<PolicyLabel>[]).map((label) => ({ ...label, workspaceId: label.workspaceId ?? getMockWorkspaceId(label.ownerId ?? 'mock-demo-user') }) as PolicyLabel) : defaults
  } catch { return defaults }
}
function saveLabels(labels: PolicyLabel[]) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(labels)) }
  catch { throw new Error('Your browser could not save local data. Check its storage settings and try again.') }
}
