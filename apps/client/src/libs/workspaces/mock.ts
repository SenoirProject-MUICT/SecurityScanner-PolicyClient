import { simulateMockLoading } from '@/libs/mock-delay'
import type { CreatedWorkspaceJoinCode, WorkspaceJoinCode, WorkspaceMember, WorkspaceMemberService } from './types'

const storageKey = 'policy-desk.mock-workspaces.v1'
type MockWorkspace = { id: string; name: string; createdAt: string }
type MockJoinCode = WorkspaceJoinCode & { codeHash: string }
type MockData = { workspaces: MockWorkspace[]; members: WorkspaceMember[]; joinCodes: MockJoinCode[] }

export const mockWorkspaceMemberService: WorkspaceMemberService = {
  async listWorkspaces(user) {
    await simulateMockLoading()
    const data = readData()
    let active = data.members.filter((member) => member.userId === user.id && member.status === 'active')
    if (!active.length) {
      const invitations = data.members.filter((member) => member.email.toLowerCase() === user.email.toLowerCase() && member.status === 'invited')
      if (invitations.length) {
        const hasDefault = data.members.some((member) => member.userId === user.id && member.status === 'active' && member.isDefault)
        for (const invitation of invitations) {
          invitation.userId = user.id
          invitation.name = user.name
          invitation.status = 'active'
          invitation.isDefault = !hasDefault && invitation === invitations[0]
        }
        active = invitations
        writeData(data)
      }
    }
    if (!active.length && data.members.some((member) => member.userId === user.id)) throw new Error('Workspace access is disabled. Contact a workspace admin.')
    if (!active.some((member) => member.isDefault)) {
      active[0].isDefault = true
      writeData(data)
    }
    return active.map((member) => ({ id: member.workspaceId, name: data.workspaces.find((workspace) => workspace.id === member.workspaceId)?.name ?? 'Workspace', role: member.role, isDefault: member.isDefault }))
  },
  async createWorkspace(name) {
    await simulateMockLoading()
    const user = readCurrentUser()
    if (!user) throw new Error('Sign in before creating a workspace.')
    const data = readData()
    if (data.members.some((member) => member.userId === user.id && member.status === 'active')) throw new Error('You already belong to a workspace.')
    const now = new Date().toISOString()
    const workspaceId = getMockWorkspaceId(user.id)
    const workspace: MockWorkspace = { id: workspaceId, name: name.trim(), createdAt: now }
    const owner: WorkspaceMember = { id: `mock-membership-${hash(user.id)}`, workspaceId, userId: user.id, email: user.email, name: user.name, role: 'admin', status: 'active', isDefault: true, createdAt: now }
    data.workspaces.push(workspace)
    data.members.push(owner)
    writeData(data)
  },
  async joinWorkspace(code) {
    await simulateMockLoading()
    const user = readCurrentUser()
    if (!user) throw new Error('Sign in before joining a workspace.')
    const data = readData()
    const normalizedCode = code.trim().toUpperCase()
    const joinCode = data.joinCodes.find((item) => item.codeHash === hash(normalizedCode))
    if (!joinCode || joinCode.revokedAt || Date.parse(joinCode.expiresAt) <= Date.now()) throw new Error('This join code is invalid or has expired.')
    const existing = data.members.find((member) => member.workspaceId === joinCode.workspaceId && member.userId === user.id)
    if (existing?.status === 'active') throw new Error('You already belong to this workspace.')
    if (existing?.status === 'disabled') throw new Error('Your access to this workspace is disabled. Contact an admin.')
    const hasDefault = data.members.some((member) => member.userId === user.id && member.status === 'active' && member.isDefault)
    const membership: WorkspaceMember = { id: `mock-membership-${hash(`${joinCode.workspaceId}:${user.id}`)}`, workspaceId: joinCode.workspaceId, userId: user.id, email: user.email, name: user.name, role: 'member', status: 'active', isDefault: !hasDefault, createdAt: new Date().toISOString() }
    if (existing) Object.assign(existing, membership)
    else data.members.push(membership)
    writeData(data)
  },
  async listMembers(workspaceId) {
    await simulateMockLoading()
    const data = readData()
    const members = data.members.filter((member) => member.workspaceId === workspaceId)
    if (!members.length) throw new Error('Workspace not found or you do not have access.')
    const caller = members.find((member) => member.userId === readCurrentUserId())
    return { members: [...members].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), canManage: caller?.status === 'active' && caller.role === 'admin' }
  },
  async invite(workspaceId, email, role) {
    await simulateMockLoading()
    const data = readData()
    const workspaceMembers = requireAdmin(data, workspaceId)
    if (workspaceMembers.some((member) => member.email.toLowerCase() === email.toLowerCase())) throw new Error('This email already belongs to the workspace.')
    data.members.push({ id: `mock-invite-${hash(`${workspaceId}:${email.toLowerCase()}`)}`, workspaceId, userId: null, email: email.trim().toLowerCase(), name: '', role, status: 'invited', isDefault: false, createdAt: new Date().toISOString() })
    writeData(data)
  },
  async listJoinCodes(workspaceId) {
    await simulateMockLoading()
    const data = readData()
    requireAdmin(data, workspaceId)
    return data.joinCodes.filter((item) => item.workspaceId === workspaceId).map(({ id, workspaceId: codeWorkspaceId, expiresAt, createdAt, revokedAt }) => ({ id, workspaceId: codeWorkspaceId, expiresAt, createdAt, revokedAt }))
  },
  async createJoinCode(workspaceId, expiresInDays) {
    await simulateMockLoading()
    if (![1, 7, 30].includes(expiresInDays)) throw new Error('Choose an expiration of 1, 7, or 30 days.')
    const data = readData()
    requireAdmin(data, workspaceId)
    const code = createCode()
    const now = new Date()
    const joinCode: MockJoinCode = { id: `mock-join-code-${hash(`${workspaceId}:${code}`)}`, workspaceId, codeHash: hash(code), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + expiresInDays * 86400000).toISOString(), revokedAt: null }
    data.joinCodes.push(joinCode)
    writeData(data)
    return { id: joinCode.id, workspaceId: joinCode.workspaceId, expiresAt: joinCode.expiresAt, createdAt: joinCode.createdAt, revokedAt: null, code } satisfies CreatedWorkspaceJoinCode
  },
  async revokeJoinCode(workspaceId, codeId) {
    await simulateMockLoading()
    const data = readData()
    requireAdmin(data, workspaceId)
    const joinCode = data.joinCodes.find((item) => item.workspaceId === workspaceId && item.id === codeId)
    if (!joinCode) throw new Error('This join code is no longer available.')
    joinCode.revokedAt = new Date().toISOString()
    writeData(data)
  },
  async setRole(workspaceId, memberId, role) {
    await simulateMockLoading()
    const data = readData()
    const members = requireAdmin(data, workspaceId)
    const member = requireMember(members, memberId)
    if (member.role === 'admin' && member.status === 'active' && role !== 'admin' && members.filter((item) => item.role === 'admin' && item.status === 'active').length <= 1) throw new Error('A workspace must have at least one active admin.')
    member.role = role
    writeData(data)
  },
  async setStatus(workspaceId, memberId, status) {
    await simulateMockLoading()
    const data = readData()
    const members = requireAdmin(data, workspaceId)
    const member = requireMember(members, memberId)
    if (member.role === 'admin' && member.status === 'active' && status !== 'active' && members.filter((item) => item.role === 'admin' && item.status === 'active').length <= 1) throw new Error('A workspace must have at least one active admin.')
    member.status = status
    writeData(data)
  },
  async remove(workspaceId, memberId) {
    await simulateMockLoading()
    const data = readData()
    const members = requireAdmin(data, workspaceId)
    const member = requireMember(members, memberId)
    if (member.role === 'admin' && member.status === 'active' && members.filter((item) => item.role === 'admin' && item.status === 'active').length <= 1) throw new Error('A workspace must have at least one active admin.')
    data.members = data.members.filter((item) => item.id !== memberId)
    writeData(data)
  },
}

function requireAdmin(data: MockData, workspaceId: string) {
  const members = data.members.filter((member) => member.workspaceId === workspaceId)
  const caller = members.find((member) => member.userId === readCurrentUserId())
  if (!caller || caller.status !== 'active') throw new Error('You are not an active member of this workspace.')
  if (caller.role !== 'admin') throw new Error('Only workspace admins can manage members.')
  return members
}
function requireMember(members: WorkspaceMember[], id: string) {
  const member = members.find((item) => item.id === id)
  if (!member) throw new Error('That member is no longer in this workspace.')
  return member
}
function readCurrentUserId() {
  return readCurrentUser()?.id ?? ''
}
function readCurrentUser() {
  try { return JSON.parse(window.localStorage.getItem('policy-desk.mock-auth.v1') ?? 'null') as { id: string; email: string; name: string } | null } catch { return null }
}
function readData(): MockData {
  try {
    const data = JSON.parse(window.localStorage.getItem(storageKey) ?? '{"workspaces":[],"members":[]}') as Partial<MockData>
    return { workspaces: data.workspaces ?? [], members: data.members ?? [], joinCodes: data.joinCodes ?? [] }
  } catch { return { workspaces: [], members: [], joinCodes: [] } }
}
function writeData(data: MockData) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(data)) }
  catch { throw new Error('Your browser could not save workspace members. Check its storage settings and try again.') }
}
function hash(value: string) { let result = 2166136261; for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619); return (result >>> 0).toString(36) }

export function getMockWorkspaceId(userId: string) { return `mock-workspace-${hash(userId)}` }
function createCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `PD-${value.match(/.{4}/g)!.join('-')}`
}
