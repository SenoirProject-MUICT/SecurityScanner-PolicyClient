export const policyQueryKeys = {
  all: () => ['policies'] as const,
  list: (workspaceId: string) => ['policies', workspaceId] as const,
  activity: (workspaceId: string) => ['policy-activity', workspaceId] as const,
  allHistory: (workspaceId: string) => ['policy-history', workspaceId] as const,
  history: (workspaceId: string, policyId: string) => ['policy-history', workspaceId, policyId] as const,
}

export const policyMutationKeys = {
  create: (workspaceId: string) => ['policies', 'create', workspaceId] as const,
  update: (workspaceId: string) => ['policies', 'update', workspaceId] as const,
  remove: (workspaceId: string) => ['policies', 'delete', workspaceId] as const,
  setStatus: (workspaceId: string) => ['policies', 'status', workspaceId] as const,
  submit: (workspaceId: string) => ['policies', 'submit', workspaceId] as const,
  review: (workspaceId: string) => ['policies', 'review', workspaceId] as const,
}
