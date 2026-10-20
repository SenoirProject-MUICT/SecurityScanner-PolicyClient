import { Badge } from '@/components/ui/badge'
import { getPolicyLifecycle, policyLifecycleLabels, type Policy } from '@/libs/policies'

export function PolicyStatusBadge({ policy }: { policy: Policy }) {
  const status = getPolicyLifecycle(policy)
  return <Badge className={`policy-status status-${status}`}><span />{policyLifecycleLabels[status]}</Badge>
}
