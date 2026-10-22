export const ApiRoute = {
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    me: '/auth/me',
    signOut: '/auth/sign-out',
    refresh: '/auth/refresh',
  },
  policies: {
    collection: '/policies',
    activity: '/policies/activity',
    item: (id: string) => `/policies/${encodeURIComponent(id)}`,
    status: (id: string) => `/policies/${encodeURIComponent(id)}/status`,
    submit: (id: string) => `/policies/${encodeURIComponent(id)}/submit`,
    approve: (id: string) => `/policies/${encodeURIComponent(id)}/approve`,
    reject: (id: string) => `/policies/${encodeURIComponent(id)}/reject`,
    history: (id: string) => `/policies/${encodeURIComponent(id)}/history`,
  },
  labels: {
    collection: '/labels',
    item: (id: string) => `/labels/${encodeURIComponent(id)}`,
  },
  integrations: {
    githubInstallUrl: '/integrations/github/install-url',
  },
  repositoryConnections: {
    collection: '/repository-connections',
    item: (id: string) => `/repository-connections/${encodeURIComponent(id)}`,
    sync: (id: string) => `/repository-connections/${encodeURIComponent(id)}/sync`,
    linkedRepositories: (id: string) => `/repository-connections/${encodeURIComponent(id)}/linked-repositories`,
  },
  reviewRequests: {
    collection: '/review-requests',
    item: (id: string) => `/review-requests/${encodeURIComponent(id)}`,
  },
  workspaceMembers: '/workspace-members',
} as const

export const HttpMethod = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
} as const

export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod]

export const HttpStatus = {
  Ok: 200,
  Created: 201,
  NoContent: 204,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  UnprocessableEntity: 422,
  TooManyRequests: 429,
  InternalServerError: 500,
  BadGateway: 502,
  ServiceUnavailable: 503,
} as const

export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus]
