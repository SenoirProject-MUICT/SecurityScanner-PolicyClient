export const labelQueryKeys = {
  all: () => ['labels'] as const,
  list: (workspaceId: string) => ['labels', workspaceId] as const,
}

export const labelMutationKeys = {
  create: (workspaceId: string) => ['labels', 'create', workspaceId] as const,
  update: (workspaceId: string) => ['labels', 'update', workspaceId] as const,
  remove: (workspaceId: string) => ['labels', 'delete', workspaceId] as const,
}
