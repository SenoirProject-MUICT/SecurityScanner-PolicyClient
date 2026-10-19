import { create } from 'zustand'

type WorkspaceSelectionState = {
  selectedWorkspaceId: string
  enteredWorkspaceId: string
  selectWorkspace: (workspaceId: string) => void
  enterWorkspace: (workspaceId: string) => void
  leaveWorkspace: () => void
  resetSelection: () => void
}

export const useWorkspaceStore = create<WorkspaceSelectionState>((set) => ({
  selectedWorkspaceId: '',
  enteredWorkspaceId: '',
  selectWorkspace: (selectedWorkspaceId) => set({ selectedWorkspaceId }),
  enterWorkspace: (workspaceId) => set({ selectedWorkspaceId: workspaceId, enteredWorkspaceId: workspaceId }),
  leaveWorkspace: () => set({ enteredWorkspaceId: '' }),
  resetSelection: () => set({ selectedWorkspaceId: '', enteredWorkspaceId: '' }),
}))
