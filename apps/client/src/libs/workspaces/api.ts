import { apiRequest, ApiError, ApiRoute, HttpMethod } from '@/libs/api/client'
import { WorkspaceAccessDeniedError } from './errors'
import type { CreatedWorkspaceJoinCode, WorkspaceJoinCode, WorkspaceMember, WorkspaceMemberService, WorkspaceOption, WorkspaceRole } from './types'

type FunctionMember = { id: string; workspace_id: string; user_id: string | null; email: string | null; display_name: string; role: WorkspaceRole; status: WorkspaceMember['status']; is_default: boolean; created_at: string }

export const apiWorkspaceMemberService: WorkspaceMemberService = {
  async listWorkspaces() {
    try {
      const data = await invoke<{ workspaces: Array<{ workspaceId: string; name: string; role: WorkspaceRole; isDefault: boolean }> }>({ action: 'list-workspaces' })
      return data.workspaces.map((workspace): WorkspaceOption => ({ id: workspace.workspaceId, name: workspace.name, role: workspace.role, isDefault: workspace.isDefault }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) throw new WorkspaceAccessDeniedError(error.message)
      throw error
    }
  },
  async createWorkspace(name) { await invoke({ action: 'create-workspace', name }) },
  async joinWorkspace(code) { await invoke({ action: 'join-workspace', code }) },
  async updateWorkspace(workspaceId, name) { await invoke({ action: 'update-workspace', workspaceId, name }) },
  async deleteWorkspace(workspaceId) { await invoke({ action: 'delete-workspace', workspaceId }) },
  async listMembers(workspaceId) {
    const data = await invoke<{ members: FunctionMember[]; canManage: boolean }>({ action: 'list-members', workspaceId })
    return { members: data.members.map(mapMember), canManage: data.canManage }
  },
  async invite(workspaceId, email, role) { await invoke({ action: 'invite', workspaceId, email, role }) },
  async listJoinCodes(workspaceId) {
    const data = await invoke<{ joinCodes: Array<{ id: string; workspace_id: string; expires_at: string; created_at: string; revoked_at: string | null; code_available: boolean }> }>({ action: 'list-join-codes', workspaceId })
    return data.joinCodes.map((code): WorkspaceJoinCode => ({ id: code.id, workspaceId: code.workspace_id, expiresAt: code.expires_at, createdAt: code.created_at, revokedAt: code.revoked_at, codeAvailable: code.code_available }))
  },
  async createJoinCode(workspaceId, expiresInDays) {
    const data = await invoke<{ joinCode: { id: string; workspace_id: string; code: string; expires_at: string; created_at: string } }>({ action: 'create-join-code', workspaceId, expiresInDays })
    return { id: data.joinCode.id, workspaceId: data.joinCode.workspace_id, code: data.joinCode.code, expiresAt: data.joinCode.expires_at, createdAt: data.joinCode.created_at, revokedAt: null, codeAvailable: true } satisfies CreatedWorkspaceJoinCode
  },
  async revealJoinCode(workspaceId, codeId) { return (await invoke<{ code: string }>({ action: 'reveal-join-code', workspaceId, codeId })).code },
  async revokeJoinCode(workspaceId, codeId) { await invoke({ action: 'revoke-join-code', workspaceId, codeId }) },
  async setRole(workspaceId, memberId, role) { await invoke({ action: 'set-role', workspaceId, memberId, role }) },
  async setStatus(workspaceId, memberId, status) { await invoke({ action: 'set-status', workspaceId, memberId, status }) },
  async remove(workspaceId, memberId) { await invoke({ action: 'remove', workspaceId, memberId }) },
}

async function invoke<T = unknown>(body: Record<string, unknown>): Promise<T> {
  return apiRequest<T>(ApiRoute.workspaceMembers, { method: HttpMethod.Post, data: body })
}

function mapMember(row: FunctionMember): WorkspaceMember {
  return { id: row.id, workspaceId: row.workspace_id, userId: row.user_id, email: row.email ?? '', name: row.display_name || row.email?.split('@')[0] || 'Workspace member', role: row.role, status: row.status, isDefault: row.is_default, createdAt: row.created_at }
}
