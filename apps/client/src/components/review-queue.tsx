import { useState } from 'react'
import { AlertCircle, GitPullRequest } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewRequestCard } from '@/components/review-request-card'
import { useReviewRequests } from '@/libs/repositories/hooks'
import { withWorkspaceId } from '@/libs/workspaces/navigation'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { ReviewRequestStateFilter } from '@/libs/repositories'

const stateOptions: Array<{ value: ReviewRequestStateFilter; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
  { value: 'all', label: 'All states' },
]

export function ReviewQueue({ repositoryId }: { repositoryId: string }) {
  const workspaceId = useWorkspaceStore((store) => store.selectedWorkspaceId)
  const [state, setState] = useState<ReviewRequestStateFilter>('open')
  const { requests, isLoading, error } = useReviewRequests({ repositoryId, state })

  return <section aria-label="Review queue">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Review queue</h2>
      <Select value={state} onValueChange={(value) => { if (value) setState(value as ReviewRequestStateFilter) }}>
        <SelectTrigger aria-label="Filter by state" className="min-w-36"><span>{stateOptions.find((option) => option.value === state)?.label}</span></SelectTrigger>
        <SelectContent align="end">{stateOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    {error && <Alert variant="destructive" className="mb-4"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert>}
    {isLoading
      ? <div className="flex flex-col gap-3" aria-label="Loading pull requests">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-24 w-full" />)}</div>
      : requests.length === 0
        ? <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><GitPullRequest /></EmptyMedia>
              <EmptyTitle>{state === 'open' ? 'No open pull requests' : 'No pull requests in this state'}</EmptyTitle>
              <EmptyDescription>{state === 'open' ? 'New pull requests in this repository appear here after they are opened or synced.' : 'Try another state.'}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        : <ul className="flex flex-col gap-3">{requests.map((request) => <li key={request.id}><ReviewRequestCard request={request} to={withWorkspaceId(`/repositories/${repositoryId}/${request.id}`, workspaceId)} /></li>)}</ul>}
  </section>
}
