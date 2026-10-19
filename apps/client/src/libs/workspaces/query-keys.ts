export const workspaceQueryKeys = {
  all: () => ['workspaces'] as const,
  list: (userId: string) => ['workspaces', userId] as const,
  members: (workspaceId: string) => ['workspace-members', workspaceId] as const,
  joinCodes: (workspaceId: string) => ['workspace-join-codes', workspaceId] as const,
}

export const workspaceMutationKeys = {
  create: () => ['workspaces', 'create'] as const,
  join: () => ['workspaces', 'join'] as const,
  update: () => ['workspaces', 'update'] as const,
  delete: () => ['workspaces', 'delete'] as const,
  invite: (workspaceId: string) => ['workspace-members', 'invite', workspaceId] as const,
  changeRole: (workspaceId: string) => ['workspace-members', 'role', workspaceId] as const,
  changeStatus: (workspaceId: string) => ['workspace-members', 'status', workspaceId] as const,
  removeMember: (workspaceId: string) => ['workspace-members', 'remove', workspaceId] as const,
  createJoinCode: (workspaceId: string) => ['workspace-join-codes', 'create', workspaceId] as const,
  revealJoinCode: (workspaceId: string) => ['workspace-join-codes', 'reveal', workspaceId] as const,
  revokeJoinCode: (workspaceId: string) => ['workspace-join-codes', 'revoke', workspaceId] as const,
}
