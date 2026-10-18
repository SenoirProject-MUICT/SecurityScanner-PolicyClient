export type WorkspaceRole = 'admin' | 'member'
export type WorkspaceMemberStatus = 'active' | 'invited' | 'disabled'

export type WorkspaceOption = {
  id: string
  name: string
  role: WorkspaceRole
  isDefault: boolean
}

export type WorkspaceMember = {
  id: string
  workspaceId: string
  userId: string | null
  email: string
  name: string
  role: WorkspaceRole
  status: WorkspaceMemberStatus
  isDefault: boolean
  createdAt: string
}

export type WorkspaceJoinCode = {
  id: string
  workspaceId: string
  expiresAt: string
  createdAt: string
  revokedAt: string | null
}

export type CreatedWorkspaceJoinCode = WorkspaceJoinCode & { code: string }

export type WorkspaceMemberService = {
  listWorkspaces(user: { id: string; email: string; name: string }): Promise<WorkspaceOption[]>
  createWorkspace(name: string): Promise<void>
  joinWorkspace(code: string): Promise<void>
  listMembers(workspaceId: string): Promise<{ members: WorkspaceMember[]; canManage: boolean }>
  invite(workspaceId: string, email: string, role: WorkspaceRole): Promise<void>
  listJoinCodes(workspaceId: string): Promise<WorkspaceJoinCode[]>
  createJoinCode(workspaceId: string, expiresInDays: number): Promise<CreatedWorkspaceJoinCode>
  revokeJoinCode(workspaceId: string, codeId: string): Promise<void>
  setRole(workspaceId: string, memberId: string, role: WorkspaceRole): Promise<void>
  setStatus(workspaceId: string, memberId: string, status: Exclude<WorkspaceMemberStatus, 'invited'>): Promise<void>
  remove(workspaceId: string, memberId: string): Promise<void>
}
