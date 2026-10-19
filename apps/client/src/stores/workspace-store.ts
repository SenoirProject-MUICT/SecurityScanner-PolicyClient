import { create } from 'zustand'
import { useAuthStore } from '@/stores/auth-store'
import { createWorkspace as createWorkspaceRequest, inviteWorkspaceMember, joinWorkspace as joinWorkspaceRequest, listWorkspaceMembers, listWorkspaces, removeWorkspaceMember, setWorkspaceMemberRole, setWorkspaceMemberStatus, type WorkspaceMember, type WorkspaceMemberStatus, type WorkspaceOption, type WorkspaceRole } from '@/libs/workspaces'

type WorkspaceState = {
  workspaces: WorkspaceOption[]
  selectedWorkspaceId: string
  members: WorkspaceMember[]
  canManage: boolean
  isLoading: boolean
  isMutating: boolean
  error: string
  initialize: () => Promise<void>
  createWorkspace: (name: string) => Promise<void>
  joinWorkspace: (code: string) => Promise<void>
  selectWorkspace: (workspaceId: string) => Promise<void>
  invite: (email: string, role: WorkspaceRole) => Promise<void>
  changeRole: (memberId: string, role: WorkspaceRole) => Promise<void>
  changeStatus: (memberId: string, status: Exclude<WorkspaceMemberStatus, 'invited'>) => Promise<void>
  remove: (memberId: string) => Promise<void>
  refresh: () => Promise<void>
}

let initialization: Promise<void> | null = null

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  selectedWorkspaceId: '',
  members: [],
  canManage: false,
  isLoading: true,
  isMutating: false,
  error: '',
  initialize: () => {
    if (initialization) return initialization
    initialization = (async () => {
      const user = useAuthStore.getState().user
      if (!user) { set({ workspaces: [], members: [], selectedWorkspaceId: '', canManage: false, isLoading: false, error: '' }); return }
      set({ workspaces: [], members: [], selectedWorkspaceId: '', canManage: false, isLoading: true, error: '' })
      try {
        const workspaces = await listWorkspaces(user)
        const selectedWorkspaceId = workspaces.find((workspace) => workspace.isDefault)?.id ?? workspaces[0]?.id ?? ''
        set({ workspaces, selectedWorkspaceId })
        if (selectedWorkspaceId) await get().refresh()
        else set({ members: [], canManage: false })
      } catch (cause) { set({ workspaces: [], members: [], selectedWorkspaceId: '', canManage: false, error: toMessage(cause) }) }
      finally { set({ isLoading: false }) }
    })().finally(() => { initialization = null })
    return initialization
  },
  createWorkspace: async (name) => {
    set({ isMutating: true, error: '' })
    try { await createWorkspaceRequest(name); await get().initialize() }
    finally { set({ isMutating: false }) }
  },
  joinWorkspace: async (code) => {
    set({ isMutating: true, error: '' })
    try { await joinWorkspaceRequest(code); await get().initialize() }
    finally { set({ isMutating: false }) }
  },
  selectWorkspace: async (selectedWorkspaceId) => {
    set({ selectedWorkspaceId, isLoading: true, error: '' })
    try { await get().refresh() }
    catch (cause) { set({ error: toMessage(cause) }) }
    finally { set({ isLoading: false }) }
  },
  invite: async (email, role) => mutate(set, async () => inviteWorkspaceMember(get().selectedWorkspaceId, email, role), get().refresh),
  changeRole: async (memberId, role) => mutate(set, async () => setWorkspaceMemberRole(get().selectedWorkspaceId, memberId, role), get().refresh),
  changeStatus: async (memberId, status) => mutate(set, async () => setWorkspaceMemberStatus(get().selectedWorkspaceId, memberId, status), get().refresh),
  remove: async (memberId) => mutate(set, async () => removeWorkspaceMember(get().selectedWorkspaceId, memberId), get().refresh),
  refresh: async () => {
    const workspaceId = get().selectedWorkspaceId
    if (!workspaceId) { set({ members: [], canManage: false }); return }
    const { members, canManage } = await listWorkspaceMembers(workspaceId)
    set({ members, canManage, error: '' })
  },
}))

async function mutate(set: (partial: Partial<WorkspaceState>) => void, operation: () => Promise<void>, refresh: () => Promise<void>) {
  set({ isMutating: true, error: '' })
  try { await operation(); await refresh() }
  catch (cause) { set({ error: toMessage(cause) }); throw cause }
  finally { set({ isMutating: false }) }
}

function toMessage(cause: unknown) { return cause instanceof Error ? cause.message : 'Workspace member request failed.' }
