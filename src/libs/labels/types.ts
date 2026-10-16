export type PolicyLabel = { id: string; name: string; ownerId: string; createdBy: string; createdAt: string }
export type LabelRepository = {
  list(): Promise<PolicyLabel[]>
  create(name: string, ownerId: string, createdBy: string): Promise<PolicyLabel>
  update(id: string, name: string): Promise<PolicyLabel>
  delete(id: string): Promise<void>
}
