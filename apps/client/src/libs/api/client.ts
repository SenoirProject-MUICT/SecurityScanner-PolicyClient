import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { ApiRoute, HttpStatus } from './routes'
import { apiBaseUrl } from './config'
import { clearApiSession, readApiSession, saveApiSession, type ApiSession } from '@/libs/auth/session'

export { apiBaseUrl } from './config'
export { ApiRoute, HttpMethod } from './routes'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}

const http : AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

let refreshInFlight: Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> | null = null

function getAccessToken(accessToken: string | null | undefined) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

function isUnauthorizedError(error: unknown, authenticate: boolean, session: ApiSession | null, path: string) : boolean {
  return Boolean(axios.isAxiosError(error) && error.response?.status === HttpStatus.Unauthorized && authenticate && session?.refreshToken && path !== ApiRoute.auth.refresh)
}

export async function apiRequest<T>(path: string, config: AxiosRequestConfig = {}, authenticate = true): Promise<T> {
  const session : ApiSession | null = authenticate ? readApiSession() : null
  const requestConfig: AxiosRequestConfig = {
    ...config,
    headers: { ...config.headers, ...getAccessToken(session?.accessToken) },
  }


  try {
    const response = await http.request<T>({ url: path, ...requestConfig })
    return response.data
  } catch (error) {
    // Check if the error is an unauthorized error
    const isUnauthorized = isUnauthorizedError(error, authenticate, session, path)
    const refreshToken = session?.refreshToken

    if (isUnauthorized && refreshToken) {
      const refreshed = await refreshSession(refreshToken)
      if (refreshed) {
        const retryConfig: AxiosRequestConfig = {
          ...requestConfig,
          headers: { ...requestConfig.headers, Authorization: `Bearer ${refreshed.accessToken}` },
        }
        return (await http.request<T>({ url: path, ...retryConfig })).data
      }
      clearApiSession()
    }

    if (axios.isAxiosError<{ detail?: string; error?: string }>(error)) {
      const data = error.response?.data as { detail?: string; error?: string } | undefined
      throw new ApiError(data?.detail || data?.error || error.message || 'API request failed.', error.response?.status ?? 0, { cause: error })
    }
    throw error
  }
}

export function queryString(values: Record<string, string>) { return new URLSearchParams(values).toString() }

function refreshSession(refreshToken: string) {
  if (!refreshInFlight) refreshInFlight = requestRefresh(refreshToken).finally(() => { refreshInFlight = null })
  return refreshInFlight
}

async function requestRefresh(refreshToken: string) {
  try {
    const { data } = await http.post<{ session: { accessToken: string; refreshToken: string; expiresAt: number } }>(ApiRoute.auth.refresh, { refreshToken })
    saveApiSession(data.session)
    return data.session
  } catch { return null }
}
