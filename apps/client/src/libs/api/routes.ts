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
  },
  labels: {
    collection: '/labels',
    item: (id: string) => `/labels/${encodeURIComponent(id)}`,
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
