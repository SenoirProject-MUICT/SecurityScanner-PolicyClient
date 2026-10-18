import type { Policy, PolicyActivity, PolicyInput, PolicyRepository } from './types'
import { simulateMockLoading } from '@/libs/mock-delay'
import { getMockWorkspaceId } from '@/libs/workspaces/mock'

const storageKey = 'policy-desk.policies.v2'
const activityStorageKey = 'policy-desk.activity.v1'
const demoUser = { id: 'mock-demo-user', name: 'Alex Morgan' }
const samplePolicies: Policy[] = [
  {
    id: 'sample-secure-review', workspaceId: getMockWorkspaceId(demoUser.id), name: 'Secure code review', description: 'Review changes for common security risks before they are merged.',
    labels: ['Engineering', 'Security'], status: 'active',
    effectiveFrom: null, effectiveUntil: null, ownerId: demoUser.id, createdBy: demoUser.name,
    createdAt: daysAgo(12), updatedAt: daysAgo(1),
  },
  {
    id: 'sample-accessibility', workspaceId: getMockWorkspaceId(demoUser.id), name: 'Accessible product design', description: 'Make core user journeys understandable and usable for everyone.',
    labels: ['Product'], status: 'active',
    effectiveFrom: sampleDateOffset(-2), effectiveUntil: sampleDateOffset(7), ownerId: demoUser.id, createdBy: 'Priya Shah',
    createdAt: daysAgo(6), updatedAt: daysAgo(3),
  },
  {
    id: 'sample-incident', workspaceId: getMockWorkspaceId(demoUser.id), name: 'Incident response basics', description: 'Give teams a consistent process for handling and learning from incidents.',
    labels: ['Operations', 'Security'], status: 'draft',
    effectiveFrom: sampleDateOffset(3), effectiveUntil: sampleDateOffset(8), ownerId: demoUser.id, createdBy: 'Alex Morgan',
    createdAt: daysAgo(4), updatedAt: daysAgo(4),
  },
]

export const mockPolicyRepository: PolicyRepository = {
  async list(workspaceId) { await simulateMockLoading(); return readLocalPolicies().filter((policy) => policy.workspaceId === workspaceId) },
  async create(input: PolicyInput) {
    const now = new Date().toISOString()
    const policy: Policy = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    writeLocalPolicies([policy, ...readLocalPolicies()])
    return policy
  },
  async update(id, input) {
    const current = readLocalPolicies()
    const existing = current.find((policy) => policy.id === id && policy.workspaceId === input.workspaceId)
    if (!existing) throw new Error('This policy could not be found. Refresh the page and try again.')
    const policy: Policy = { ...existing, ...input, workspaceId: existing.workspaceId, ownerId: existing.ownerId, createdBy: existing.createdBy, updatedAt: new Date().toISOString() }
    writeLocalPolicies(current.map((item) => item.id === id ? policy : item))
    return policy
  },
  async delete(id, workspaceId) { writeLocalPolicies(readLocalPolicies().filter((policy) => policy.id !== id || policy.workspaceId !== workspaceId)) },
  async setStatus(id, status, workspaceId) {
    const current = readLocalPolicies()
    const existing = current.find((policy) => policy.id === id && policy.workspaceId === workspaceId)
    if (!existing) throw new Error('This policy could not be found. Refresh the page and try again.')
    const updated = { ...existing, status, updatedAt: new Date().toISOString() }
    writeLocalPolicies(current.map((policy) => policy.id === id ? updated : policy))
    return updated
  },
  async listActivity(workspaceId) { return readActivity().filter((activity) => activity.workspaceId === workspaceId) },
  async recordActivity(policy, type) {
    const activity: PolicyActivity = { id: crypto.randomUUID(), workspaceId: policy.workspaceId, policyId: policy.id, policyName: policy.name, type, occurredAt: new Date().toISOString() }
    try { window.localStorage.setItem(activityStorageKey, JSON.stringify([activity, ...readActivity()])) }
    catch { throw new Error('Your browser could not save policy activity.') }
  },
}

function readActivity(): PolicyActivity[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(activityStorageKey) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const policies = readLocalPolicies()
    return (parsed as Partial<PolicyActivity>[]).map((activity) => ({ ...activity, workspaceId: activity.workspaceId ?? policies.find((policy) => policy.id === activity.policyId)?.workspaceId ?? getMockWorkspaceId(demoUser.id) })) as PolicyActivity[]
  } catch { return [] }
}

function readLocalPolicies(): Policy[] {
  try {
    const stored = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem('policy-desk.policies.v1')
    if (!stored) { writeLocalPolicies(samplePolicies); return samplePolicies }
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return samplePolicies
    return parsed.map((value) => normalizePolicy(value as Partial<Policy>))
  } catch { return samplePolicies }
}

function normalizePolicy(value: Partial<Policy>): Policy {
  const now = new Date().toISOString()
  const status = value.status === 'draft' || value.status === 'inactive' ? value.status : 'active'
  const sampleRange = getSampleRange(value.id)
  return {
    id: value.id ?? crypto.randomUUID(), workspaceId: value.workspaceId ?? getMockWorkspaceId(value.ownerId ?? demoUser.id), name: value.name ?? 'Untitled policy', description: value.description ?? '',
    labels: value.labels ?? [], status, effectiveFrom: value.effectiveFrom ?? sampleRange?.from ?? null, effectiveUntil: value.effectiveUntil ?? sampleRange?.until ?? null,
    ownerId: value.ownerId ?? demoUser.id, createdBy: value.createdBy ?? demoUser.name,
    createdAt: value.createdAt ?? now, updatedAt: value.updatedAt ?? now,
  }
}

function writeLocalPolicies(policies: Policy[]) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(policies)) }
  catch { throw new Error('Your browser could not save local data. Check its storage settings and try again.') }
}

function daysAgo(amount: number) { const date = new Date(); date.setDate(date.getDate() - amount); date.setHours(9, 0, 0, 0); return date.toISOString() }
function sampleDateOffset(offset: number) { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function getSampleRange(id?: string) {
  if (id === 'sample-accessibility') return { from: sampleDateOffset(-2), until: sampleDateOffset(7) }
  if (id === 'sample-incident') return { from: sampleDateOffset(3), until: sampleDateOffset(8) }
  return null
}
