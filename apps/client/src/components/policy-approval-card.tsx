import { CircleCheck, CircleX, Clock, History, Pencil, Power, PowerOff, RotateCcw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Policy, PolicyApprovalAction, PolicyApprovalEvent } from '@/libs/policies'

const actionCopy: Record<PolicyApprovalAction, { verb: string; icon: typeof Send }> = {
  submitted: { verb: 'submitted for approval', icon: Send },
  approved: { verb: 'approved', icon: CircleCheck },
  rejected: { verb: 'rejected', icon: CircleX },
  reopened: { verb: 'edited the approved policy', icon: RotateCcw },
  deactivated: { verb: 'turned the policy off', icon: PowerOff },
  reactivated: { verb: 'turned the policy on', icon: Power },
}

type PolicyReviewAccess = { isAdmin: boolean; currentUserId: string; activeAdminCount: number }

export function PolicyApprovalCard({ policy, events, isLoading, error, access, isBusy, onSubmit, onApprove, onReject, onEdit }: {
  policy: Policy
  events: PolicyApprovalEvent[]
  isLoading: boolean
  error: string
  access: PolicyReviewAccess
  isBusy: boolean
  onSubmit: () => void
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
}) {
  const submitted = events.find((event) => event.action === 'submitted' && event.policyVersion === policy.version)
  const decision = events.find((event) => (event.action === 'approved' || event.action === 'rejected') && event.policyVersion === policy.version)
  const isOwnSubmission = Boolean(policy.submittedBy && policy.submittedBy === access.currentUserId)
  const needsAnotherAdmin = isOwnSubmission && access.activeAdminCount > 1
  const summary = getSummary(policy, submitted, decision)

  return <Card className="detail-card policy-approval-card"><CardContent>
    <div className="approval-state">
      <div className="approval-state-copy"><p className="section-eyebrow">APPROVAL</p><h2>{summary.title}</h2><p>{summary.description}</p>
        {policy.status === 'rejected' && decision?.note && <blockquote className="approval-reason"><strong>{decision.actorName} wrote</strong>{decision.note}</blockquote>}
        {policy.status === 'pending' && access.isAdmin && needsAnotherAdmin && <p className="approval-hint">You submitted this policy, so another admin needs to approve it.</p>}
        {policy.status === 'pending' && access.isAdmin && isOwnSubmission && !needsAnotherAdmin && <p className="approval-hint">You’re the only admin, so you can approve your own submission. The history will record it as self-approved.</p>}
        {policy.status === 'pending' && !access.isAdmin && <p className="approval-hint">A workspace admin will review it. You can still edit it while it waits.</p>}
      </div>
      <div className="approval-actions">
        {(policy.status === 'draft' || policy.status === 'rejected') && <>{policy.status === 'rejected' && <Button variant="outline" onClick={onEdit}><Pencil data-icon="inline-start" /> Edit</Button>}<Button className="primary-action" disabled={isBusy} onClick={onSubmit}><Send data-icon="inline-start" /> {policy.status === 'rejected' ? 'Resubmit' : 'Submit for approval'}</Button></>}
        {policy.status === 'pending' && access.isAdmin && <><Button variant="outline" className="approval-reject" disabled={isBusy} onClick={onReject}><CircleX data-icon="inline-start" /> Reject</Button><Button className="primary-action" disabled={isBusy || needsAnotherAdmin} onClick={onApprove}><CircleCheck data-icon="inline-start" /> Approve</Button></>}
      </div>
    </div>
    <section className="approval-history" aria-labelledby="approval-history-heading">
      <p className="section-eyebrow" id="approval-history-heading"><History aria-hidden="true" /> ACTIVITY HISTORY</p>
      {isLoading ? <div className="approval-history-loading" aria-label="Loading approval history">{[0, 1].map((item) => <Skeleton key={item} />)}</div>
        : error ? <p className="muted-copy" role="alert">Could not load the approval history: {error}</p>
        : events.length ? <ol className="approval-timeline">{events.map((event) => { const { verb, icon: Icon } = actionCopy[event.action]; return <li key={event.id} className={`approval-event is-${event.action}`}>
          <span className="approval-event-icon"><Icon aria-hidden="true" /></span>
          <div className="approval-event-body"><p><strong>{event.actorName || 'A workspace member'}</strong> {verb}{event.selfApproved && <span className="approval-self-tag">Self-approved · only admin</span>}</p><small><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time> · Version {event.policyVersion}</small>{event.note && <p className="approval-event-note">{event.note}</p>}</div>
        </li> })}</ol>
        : <p className="muted-copy"><Clock aria-hidden="true" className="approval-empty-icon" /> No approval activity yet. Policies created before approvals were introduced count as approved.</p>}
    </section>
  </CardContent></Card>
}

function getSummary(policy: Policy, submitted?: PolicyApprovalEvent, decision?: PolicyApprovalEvent) {
  const submittedBy = submitted ? ` by ${submitted.actorName}` : ''
  const submittedAt = policy.submittedAt ? ` on ${formatDate(policy.submittedAt)}` : ''
  switch (policy.status) {
    case 'draft': return { title: 'Not submitted', description: 'Submit this policy when it’s ready. It applies to AI checks only after a workspace admin approves it.' }
    case 'pending': return { title: 'Waiting for approval', description: `Submitted${submittedBy}${submittedAt}. It doesn’t apply to AI checks until an admin approves it.` }
    case 'rejected': return { title: 'Changes requested', description: `${decision ? `${decision.actorName} rejected this policy on ${formatDate(decision.occurredAt)}.` : 'An admin rejected this policy.'} Update it and resubmit for approval.` }
    default: return { title: 'Approved', description: decision ? `${decision.actorName} approved version ${policy.version} on ${formatDate(decision.occurredAt)}.` : 'This policy is approved.' }
  }
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'recently' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date) }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date) }
