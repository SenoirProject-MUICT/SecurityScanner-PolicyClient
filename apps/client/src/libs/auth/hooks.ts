import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authMutationKeys } from './query-keys'
import { authService } from './index'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function useAuthMutations() {
  const queryClient = useQueryClient()
  const signIn = useMutation({ mutationKey: authMutationKeys.signIn(), mutationFn: ({ email, password }: { email: string; password: string }) => authService.signIn(email, password) })
  const signUp = useMutation({ mutationKey: authMutationKeys.signUp(), mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) => authService.signUp(email, password, name) })
  const updateProfile = useMutation({ mutationKey: authMutationKeys.updateProfile(), mutationFn: authService.updateProfile })
  const signOut = useMutation({
    mutationKey: authMutationKeys.signOut(),
    mutationFn: authService.signOut,
    onSuccess: () => { useAuthStore.setState({ user: null }); useWorkspaceStore.getState().resetSelection(); queryClient.clear() },
  })
  return {
    signIn: (email: string, password: string) => signIn.mutateAsync({ email, password }),
    signUp: (email: string, password: string, name: string) => signUp.mutateAsync({ email, password, name }),
    updateProfile: updateProfile.mutateAsync,
    signOut: signOut.mutateAsync,
    isPending: signIn.isPending || signUp.isPending || updateProfile.isPending || signOut.isPending,
  }
}
