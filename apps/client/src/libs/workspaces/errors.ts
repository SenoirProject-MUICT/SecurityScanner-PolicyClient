export class WorkspaceAccessDeniedError extends Error {
  constructor(message = 'Your workspace access is disabled. Contact a workspace administrator.') {
    super(message)
    this.name = 'WorkspaceAccessDeniedError'
  }
}
