import { useNavigate, type NavigateOptions } from 'react-router'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function withWorkspaceId(path: string, workspaceId: string) {
  const [pathAndQuery, hash] = path.split('#', 2)
  const [pathname, query = ''] = pathAndQuery.split('?', 2)
  const params = new URLSearchParams(query)
  params.delete('workspaceId')
  const search = params.toString()
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const workspacePath = workspaceId
    ? `/${encodeURIComponent(workspaceId)}${normalizedPath === '/' ? '' : normalizedPath}`
    : normalizedPath
  return `${workspacePath}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`
}

export function useWorkspaceNavigate() {
  const navigate = useNavigate()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)

  return (path: string, options?: NavigateOptions) => navigate(withWorkspaceId(path, workspaceId), options)
}
