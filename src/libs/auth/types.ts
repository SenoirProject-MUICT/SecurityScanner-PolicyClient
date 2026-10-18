export type AuthUser = { id: string; email: string; name: string }
export type AuthService = {
  getCurrentUser(): Promise<AuthUser | null>
  signIn(email: string, password: string): Promise<AuthUser>
  signUp(email: string, password: string, name: string): Promise<AuthUser | null>
  updateProfile(name: string): Promise<AuthUser>
  signOut(): Promise<void>
  subscribe(listener: (user: AuthUser | null) => void): { unsubscribe: () => void }
}
