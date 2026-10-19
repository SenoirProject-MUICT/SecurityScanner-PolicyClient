import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import { mockWorkspaceMemberService } from './mock'
import { apiWorkspaceMemberService } from './api'

export type { CreatedWorkspaceJoinCode, WorkspaceJoinCode, WorkspaceMember, WorkspaceMemberService, WorkspaceMemberStatus, WorkspaceOption, WorkspaceRole } from './types'

const service = useRuntimeModeStore.getState().isProd ? apiWorkspaceMemberService : mockWorkspaceMemberService
export const listWorkspaces = service.listWorkspaces.bind(service)
export const createWorkspace = service.createWorkspace.bind(service)
export const joinWorkspace = service.joinWorkspace.bind(service)
export const updateWorkspace = service.updateWorkspace.bind(service)
export const deleteWorkspace = service.deleteWorkspace.bind(service)
export const listWorkspaceMembers = service.listMembers.bind(service)
export const inviteWorkspaceMember = service.invite.bind(service)
export const listWorkspaceJoinCodes = service.listJoinCodes.bind(service)
export const createWorkspaceJoinCode = service.createJoinCode.bind(service)
export const revealWorkspaceJoinCode = service.revealJoinCode.bind(service)
export const revokeWorkspaceJoinCode = service.revokeJoinCode.bind(service)
export const setWorkspaceMemberRole = service.setRole.bind(service)
export const setWorkspaceMemberStatus = service.setStatus.bind(service)
export const removeWorkspaceMember = service.remove.bind(service)
