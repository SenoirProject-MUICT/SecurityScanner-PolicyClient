import { supabase } from '@/libs/supabase'
import type { CreatedWorkspaceJoinCode, WorkspaceJoinCode, WorkspaceMember, WorkspaceMemberService, WorkspaceOption, WorkspaceRole } from './types'

type FunctionMember = { id: string; workspace_id: string; user_id: string | null; email: string | null; display_name: string; role: WorkspaceRole; status: WorkspaceMember['status']; is_default: boolean; created_at: string }

export const supabaseWorkspaceMemberService: WorkspaceMemberService = {
  async listWorkspaces() {
    const data = await invoke<{ workspaces: Array<{ workspaceId: string; name: string; role: WorkspaceRole; isDefault: boolean }> }>({ action: 'list-workspaces' })
    return data.workspaces.map((workspace): WorkspaceOption => ({ id: workspace.workspaceId, name: workspace.name, role: workspace.role, isDefault: workspace.isDefault }))
  },
  async createWorkspace(name) { await invoke({ action: 'create-workspace', name }) },
  async joinWorkspace(code) { await invoke({ action: 'join-workspace', code }) },
  async listMembers(workspaceId) {
    const data = await invoke<{ members: FunctionMember[]; canManage: boolean }>({ action: 'list-members', workspaceId })
    return { members: data.members.map(mapMember), canManage: data.canManage }
  },
  async invite(workspaceId, email, role) { await invoke({ action: 'invite', workspaceId, email, role }) },
  async listJoinCodes(workspaceId) {
    const data = await invoke<{ joinCodes: Array<{ id: string; workspace_id: string; expires_at: string; created_at: string; revoked_at: string | null }> }>({ action: 'list-join-codes', workspaceId })
    return data.joinCodes.map((code): WorkspaceJoinCode => ({ id: code.id, workspaceId: code.workspace_id, expiresAt: code.expires_at, createdAt: code.created_at, revokedAt: code.revoked_at }))
  },
  async createJoinCode(workspaceId, expiresInDays) {
    const data = await invoke<{ joinCode: { id: string; workspace_id: string; code: string; expires_at: string; created_at: string } }>({ action: 'create-join-code', workspaceId, expiresInDays })
    return { id: data.joinCode.id, workspaceId: data.joinCode.workspace_id, code: data.joinCode.code, expiresAt: data.joinCode.expires_at, createdAt: data.joinCode.created_at, revokedAt: null } satisfies CreatedWorkspaceJoinCode
  },
  async revokeJoinCode(workspaceId, codeId) { await invoke({ action: 'revoke-join-code', workspaceId, codeId }) },
  async setRole(workspaceId, memberId, role) { await invoke({ action: 'set-role', workspaceId, memberId, role }) },
  async setStatus(workspaceId, memberId, status) { await invoke({ action: 'set-status', workspaceId, memberId, status }) },
  async remove(workspaceId, memberId) { await invoke({ action: 'remove', workspaceId, memberId }) },
}

async function invoke<T = unknown>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Sign in again before managing workspace members.')
  if (import.meta.env.DEV && sessionData.session) logWorkspaceAuthDiagnostics(sessionData.session)
  const { data, error } = await supabase.functions.invoke('workspace-members', {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (error) {
    const context = error.context
    if (context instanceof Response) {
      if (context.status === 404) {
        throw new Error('The workspace-members Edge Function is not deployed to this Supabase project yet.')
      }
      try {
        const response = await context.clone().json() as { error?: string; message?: string }
        throw new Error(response.error || response.message || error.message)
      } catch (cause) {
        if (cause instanceof Error && cause.message !== error.message) throw cause
      }
    }
    if (/404|not found/i.test(error.message)) {
      throw new Error('The workspace-members Edge Function is not deployed to this Supabase project yet.')
    }
    throw new Error(error.message)
  }
  return data as T
}

function logWorkspaceAuthDiagnostics(session: NonNullable<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>) {
  const tokenSubject = readTokenSubject(session?.access_token)
  console.info('[workspace-members] local auth diagnostics', {
    hasSession: Boolean(session),
    sessionUserIdIsUuid: isUuid(session?.user.id),
    tokenSubjectIsUuid: isUuid(tokenSubject),
    tokenSubjectMatchesSessionUser: typeof tokenSubject === 'string' && tokenSubject === session?.user.id,
  })
}

function readTokenSubject(token?: string) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const claims = JSON.parse(atob(base64)) as { sub?: unknown }
    return typeof claims.sub === 'string' ? claims.sub : null
  } catch { return null }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function mapMember(row: FunctionMember): WorkspaceMember {
  return { id: row.id, workspaceId: row.workspace_id, userId: row.user_id, email: row.email ?? '', name: row.display_name || row.email?.split('@')[0] || 'Workspace member', role: row.role, status: row.status, isDefault: row.is_default, createdAt: row.created_at }
}
