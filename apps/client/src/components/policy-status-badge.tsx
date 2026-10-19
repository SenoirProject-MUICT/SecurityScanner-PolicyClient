import { Badge } from '@/components/ui/badge'
import { getPolicyLifecycle, type Policy } from '@/libs/policies'

export function PolicyStatusBadge({ policy }: { policy: Policy }) {
  const status = getPolicyLifecycle(policy)
  return <Badge className={`policy-status status-${status}`}><span />{status === 'active' ? 'Active' : status === 'scheduled' ? 'Scheduled' : status === 'draft' ? 'Draft' : 'Inactive'}</Badge>
}
