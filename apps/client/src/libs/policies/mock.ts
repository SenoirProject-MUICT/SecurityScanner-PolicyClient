import type { Policy, PolicyActivity, PolicyApprovalAction, PolicyApprovalEvent, PolicyInput, PolicyRepository, PolicyStatus } from './types'
import { simulateMockLoading } from '@/libs/mock-delay'
import { getMockWorkspaceAccess, getMockWorkspaceId } from '@/libs/workspaces/mock'

const storageKey = 'policy-desk.policies.v2'
const activityStorageKey = 'policy-desk.activity.v1'
const historyStorageKey = 'policy-desk.approval-history.v1'
const demoUser = { id: 'mock-demo-user', name: 'Alex Morgan' }
const approvedStatuses: PolicyStatus[] = ['active', 'inactive']
const policyStatuses: PolicyStatus[] = ['draft', 'pending', 'active', 'inactive', 'rejected']
const samplePolicies: Policy[] = [
  {
    id: 'sample-secure-review', workspaceId: getMockWorkspaceId(demoUser.id), name: 'Secure code review', description: 'Review changes for common security risks before they are merged.',
    labels: ['Engineering', 'Security'], status: 'active',
    effectiveFrom: null, effectiveUntil: null, ownerId: demoUser.id, createdBy: demoUser.name,
    createdAt: daysAgo(12), updatedAt: daysAgo(1), version: 1, submittedBy: null, submittedAt: null,
  },
  {
    id: 'sample-accessibility', workspaceId: getMockWorkspaceId(demoUser.id), name: 'Accessible product design', description: 'Make core user journeys understandable and usable for everyone.',
    labels: ['Product'], status: 'active',
    effectiveFrom: sampleDateOffset(-2), effectiveUntil: sampleDateOffset(7), ownerId: demoUser.id, createdBy: 'Priya Shah',
    createdAt: daysAgo(6), updatedAt: daysAgo(3), version: 1, submittedBy: null, submittedAt: null,
  },
  {
    id: 'sample-incident', workspaceId: getMockWorkspaceId(demoUser.id), name: 'Incident response basics', description: 'Give teams a consistent process for handling and learning from incidents.',
    labels: ['Operations', 'Security'], status: 'draft',
    effectiveFrom: sampleDateOffset(3), effectiveUntil: sampleDateOffset(8), ownerId: demoUser.id, createdBy: 'Alex Morgan',
    createdAt: daysAgo(4), updatedAt: daysAgo(4), version: 1, submittedBy: null, submittedAt: null,
  },
]

export const mockPolicyRepository: PolicyRepository = {
  async list(workspaceId) { await simulateMockLoading(); return readLocalPolicies().filter((policy) => policy.workspaceId === workspaceId) },
  async create(input: PolicyInput) {
    const now = new Date().toISOString()
    const pending = input.status === 'pending'
    const policy: Policy = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now, version: 1, submittedBy: pending ? input.ownerId : null, submittedAt: pending ? now : null }
    writeLocalPolicies([policy, ...readLocalPolicies()])
    if (pending) recordEvent(policy, 'submitted')
    return policy
  },
  async update(id, input) {
    const current = readLocalPolicies()
    const existing = findPolicy(current, id, input.workspaceId)
    const material = materialKey(existing) !== materialKey(input)
    // Nothing reviewed has changed, so the existing approval still stands.
    if (approvedStatuses.includes(existing.status) && !material) return existing
    const now = new Date().toISOString()
    const isNewSubmission = input.status === 'pending' && (existing.status !== 'pending' || material)
    const policy: Policy = {
      ...existing, name: input.name, description: input.description, labels: input.labels, effectiveFrom: input.effectiveFrom, effectiveUntil: input.effectiveUntil,
      status: input.status, version: material ? existing.version + 1 : existing.version, updatedAt: now,
      submittedBy: isNewSubmission ? input.ownerId : input.status === 'draft' ? null : existing.submittedBy,
      submittedAt: isNewSubmission ? now : input.status === 'draft' ? null : existing.submittedAt,
    }
    writeLocalPolicies(current.map((item) => item.id === id ? policy : item))
    if (material && approvedStatuses.includes(existing.status)) recordEvent(policy, 'reopened', 'Edited after approval; the policy no longer applies until it is approved again.')
    if (isNewSubmission) recordEvent(policy, 'submitted')
    return policy
  },
  async delete(id, workspaceId) { writeLocalPolicies(readLocalPolicies().filter((policy) => policy.id !== id || policy.workspaceId !== workspaceId)) },
  async setStatus(id, status, workspaceId) {
    requireAdmin(workspaceId)
    const existing = findPolicy(readLocalPolicies(), id, workspaceId)
    if (!approvedStatuses.includes(existing.status)) throw new Error('Only approved policies can be turned on or off.')
    if (existing.status === status) return existing
    const updated = transition(existing, { status })
    recordEvent(updated, status === 'active' ? 'reactivated' : 'deactivated')
    return updated
  },
  async submit(id, workspaceId, note) {
    const existing = findPolicy(readLocalPolicies(), id, workspaceId)
    if (existing.status !== 'draft' && existing.status !== 'rejected') throw new Error('Only draft or rejected policies can be submitted for approval.')
    const updated = transition(existing, { status: 'pending', submittedBy: currentUser().id, submittedAt: new Date().toISOString() })
    recordEvent(updated, 'submitted', note)
    return updated
  },
  async approve(id, workspaceId, note) {
    const access = requireAdmin(workspaceId)
    const existing = findPolicy(readLocalPolicies(), id, workspaceId)
    if (existing.status !== 'pending') throw new Error('Only policies waiting for approval can be approved.')
    // Separation of duties: a different admin approves, unless the submitter is the only admin.
    const selfApproved = existing.submittedBy === access.user.id
    if (selfApproved && access.activeAdminCount > 1) throw new Error('Another admin must approve a policy you submitted.')
    const updated = transition(existing, { status: 'active' })
    recordEvent(updated, 'approved', note, selfApproved)
    return updated
  },
  async reject(id, workspaceId, note) {
    requireAdmin(workspaceId)
    const reason = note.trim()
    if (!reason) throw new Error('Explain why the policy is rejected so the author can fix it.')
    const existing = findPolicy(readLocalPolicies(), id, workspaceId)
    if (existing.status !== 'pending') throw new Error('Only policies waiting for approval can be rejected.')
    const updated = transition(existing, { status: 'rejected' })
    recordEvent(updated, 'rejected', reason)
    return updated
  },
  async listHistory(id, workspaceId) { await simulateMockLoading(); return readHistory().filter((event) => event.policyId === id && event.workspaceId === workspaceId) },
  async listActivity(workspaceId) { return readActivity().filter((activity) => activity.workspaceId === workspaceId) },
  async recordActivity(policy, type) {
    const activity: PolicyActivity = { id: crypto.randomUUID(), workspaceId: policy.workspaceId, policyId: policy.id, policyName: policy.name, type, occurredAt: new Date().toISOString() }
    try { window.localStorage.setItem(activityStorageKey, JSON.stringify([activity, ...readActivity()])) }
    catch { throw new Error('Your browser could not save policy activity.') }
  },
}

function findPolicy(policies: Policy[], id: string, workspaceId: string) {
  const policy = policies.find((item) => item.id === id && item.workspaceId === workspaceId)
  if (!policy) throw new Error('This policy could not be found. Refresh the page and try again.')
  return policy
}
function transition(existing: Policy, changes: Partial<Policy>) {
  const updated: Policy = { ...existing, ...changes, updatedAt: new Date().toISOString() }
  writeLocalPolicies(readLocalPolicies().map((policy) => policy.id === existing.id ? updated : policy))
  return updated
}
function requireAdmin(workspaceId: string) {
  const access = getMockWorkspaceAccess(workspaceId)
  if (!access.user || !access.role) throw new Error('You are not an active member of this workspace.')
  if (access.role !== 'admin') throw new Error('Only workspace admins can approve, reject, or turn policies on and off.')
  return { ...access, user: access.user }
}
function currentUser() { return getMockWorkspaceAccess('').user ?? demoUser }
function materialKey(policy: Pick<Policy, 'name' | 'description' | 'labels' | 'effectiveFrom' | 'effectiveUntil'>) {
  return JSON.stringify([policy.name, policy.description, [...policy.labels].sort(), policy.effectiveFrom || null, policy.effectiveUntil || null])
}

function recordEvent(policy: Policy, action: PolicyApprovalAction, note = '', selfApproved = false) {
  const actor = currentUser()
  const event: PolicyApprovalEvent = { id: crypto.randomUUID(), workspaceId: policy.workspaceId, policyId: policy.id, policyName: policy.name, policyVersion: policy.version, action, actorId: actor.id, actorName: actor.name, note: note.trim(), selfApproved, occurredAt: new Date().toISOString() }
  try { window.localStorage.setItem(historyStorageKey, JSON.stringify([event, ...readHistory()])) }
  catch { throw new Error('Your browser could not save approval history.') }
}

function readHistory(): PolicyApprovalEvent[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(historyStorageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed as PolicyApprovalEvent[] : []
  } catch { return [] }
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
  const status = value.status && policyStatuses.includes(value.status) ? value.status : 'active'
  const sampleRange = getSampleRange(value.id)
  return {
    id: value.id ?? crypto.randomUUID(), workspaceId: value.workspaceId ?? getMockWorkspaceId(value.ownerId ?? demoUser.id), name: value.name ?? 'Untitled policy', description: value.description ?? '',
    labels: value.labels ?? [], status, effectiveFrom: value.effectiveFrom ?? sampleRange?.from ?? null, effectiveUntil: value.effectiveUntil ?? sampleRange?.until ?? null,
    ownerId: value.ownerId ?? demoUser.id, createdBy: value.createdBy ?? demoUser.name,
    createdAt: value.createdAt ?? now, updatedAt: value.updatedAt ?? now,
    version: value.version ?? 1, submittedBy: value.submittedBy ?? null, submittedAt: value.submittedAt ?? null,
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
