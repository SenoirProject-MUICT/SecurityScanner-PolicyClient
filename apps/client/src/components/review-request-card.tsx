import { Link } from 'react-router'
import { GitBranch, GitPullRequest } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/libs/repositories/format'
import type { ReviewRequest, ReviewRequestState } from '@/libs/repositories'

const reviewStateLabels: Record<ReviewRequestState, string> = { open: 'Open', closed: 'Closed', merged: 'Merged' }

export function ReviewStateBadge({ state, isDraft }: { state: ReviewRequestState; isDraft: boolean }) {
  if (state === 'open' && isDraft) return <Badge variant="outline">Draft</Badge>
  return <Badge variant={state === 'open' ? 'default' : state === 'merged' ? 'secondary' : 'destructive'}>{reviewStateLabels[state]}</Badge>
}

export function ReviewRequestCard({ request, to }: { request: ReviewRequest; to: string }) {
  const { fileSummary } = request
  return <Link to={to} className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 font-medium"><GitPullRequest aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{request.title}</span></span>
      <ReviewStateBadge state={request.state} isDraft={request.isDraft} />
    </div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>#{request.number}</span>
      <span>by {request.author.login}</span>
      <span className="flex items-center gap-1"><GitBranch aria-hidden="true" className="size-3.5" />{request.sourceBranch} → {request.targetBranch}</span>
      <span>Updated {formatRelative(request.updatedAt)}</span>
    </div>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>{fileSummary.total} {fileSummary.total === 1 ? 'file' : 'files'}</span>
      <span className="font-mono text-primary">+{fileSummary.additions}</span>
      <span className="font-mono text-destructive">−{fileSummary.deletions}</span>
    </div>
  </Link>
}
