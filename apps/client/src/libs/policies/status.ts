import type { Policy } from './types'

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getPolicyLifecycle(policy: Policy, at = new Date()) {
  if (policy.status === 'draft') return 'draft' as const
  if (policy.status === 'pending') return 'pending' as const
  if (policy.status === 'rejected') return 'rejected' as const
  if (policy.status === 'inactive') return 'inactive' as const
  if (policy.effectiveFrom && policy.effectiveFrom > toDateKey(at)) return 'scheduled' as const
  if (policy.effectiveUntil && policy.effectiveUntil < toDateKey(at)) return 'inactive' as const
  return 'active' as const
}

type PolicyLifecycle = ReturnType<typeof getPolicyLifecycle>

export const policyLifecycleLabels: Record<PolicyLifecycle, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  pending: 'Pending approval',
  rejected: 'Rejected',
  draft: 'Draft',
  inactive: 'Inactive',
}

/** Approved policies are the only ones an admin can switch on and off. */
export function isPolicyApproved(policy: Policy) {
  return policy.status === 'active' || policy.status === 'inactive'
}
