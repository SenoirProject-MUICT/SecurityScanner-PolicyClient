export type GithubCallbackReason =
  | 'invalid_state'
  | 'expired_state'
  | 'not_admin'
  | 'installation_not_found'
  | 'installation_not_accessible'
  | 'already_connected'
  | 'github_error'

export const githubCallbackMessages: Record<GithubCallbackReason, string> = {
  invalid_state: 'The connection request could not be verified. Start again from Integrations.',
  expired_state: 'The connection request expired. Start again from Integrations.',
  not_admin: 'Only workspace admins can connect GitHub.',
  installation_not_found: 'GitHub could not find that installation. Install the app again and retry.',
  installation_not_accessible: 'The app is installed, but PolicyDesk cannot read its repositories. Check the app permissions on GitHub.',
  already_connected: 'That GitHub installation is already linked to another workspace.',
  github_error: 'GitHub returned an error while connecting. Try again in a moment.',
}

export type GithubCallbackOutcome =
  | { kind: 'connected' }
  | { kind: 'error'; message: string }

const reasons = Object.keys(githubCallbackMessages) as GithubCallbackReason[]

function isGithubCallbackReason(value: string | null): value is GithubCallbackReason {
  return reasons.some((reason) => reason === value)
}

/** Reads the query string GitHub's callback redirect leaves on the Integrations page; null when it is absent. */
export function parseGithubCallback(params: URLSearchParams): GithubCallbackOutcome | null {
  const result = params.get('github')
  if (result === 'connected') return { kind: 'connected' }
  if (result !== 'error') return null
  const reason = params.get('reason')
  return { kind: 'error', message: isGithubCallbackReason(reason) ? githubCallbackMessages[reason] : githubCallbackMessages.github_error }
}
