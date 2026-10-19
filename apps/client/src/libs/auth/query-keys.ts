export const authQueryKeys = {
  current: () => ['auth', 'current'] as const,
}

export const authMutationKeys = {
  signIn: () => ['auth', 'sign-in'] as const,
  signUp: () => ['auth', 'sign-up'] as const,
  updateProfile: () => ['auth', 'profile'] as const,
  signOut: () => ['auth', 'sign-out'] as const,
}
