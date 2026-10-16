import type { Policy } from './types'

export function isPolicyEffective(policy: Policy, at = new Date()) {
  if (policy.status !== 'active') return false
  const today = toDateKey(at)
  if (policy.effectiveFrom && policy.effectiveFrom > today) return false
  if (policy.effectiveUntil && policy.effectiveUntil < today) return false
  return true
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getPolicyLifecycle(policy: Policy, at = new Date()) {
  if (policy.status === 'draft') return 'draft' as const
  if (policy.status === 'inactive') return 'inactive' as const
  if (policy.effectiveFrom && policy.effectiveFrom > toDateKey(at)) return 'scheduled' as const
  if (policy.effectiveUntil && policy.effectiveUntil < toDateKey(at)) return 'inactive' as const
  return 'active' as const
}
