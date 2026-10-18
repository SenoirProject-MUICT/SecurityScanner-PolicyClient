export type PolicyLabel = { id: string; workspaceId: string; name: string; ownerId: string; createdBy: string; createdAt: string }
export type LabelRepository = {
  list(workspaceId: string): Promise<PolicyLabel[]>
  create(name: string, ownerId: string, createdBy: string, workspaceId: string): Promise<PolicyLabel>
  update(id: string, name: string, workspaceId: string): Promise<PolicyLabel>
  delete(id: string, workspaceId: string): Promise<void>
}
