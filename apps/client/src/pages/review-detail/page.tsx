import { Link, useParams } from 'react-router'
import { AlertCircle, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChangedFilesList } from '@/components/changed-files-list'
import { ReviewStateBadge } from '@/components/review-request-card'
import { shortSha } from '@/libs/repositories/format'
import { useReviewRequest } from '@/libs/repositories/hooks'
import { withWorkspaceId } from '@/libs/workspaces/navigation'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function ReviewDetailPage() {
  const { repositoryId, requestId } = useParams()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const { request, isLoading, error } = useReviewRequest(requestId)
  const backLink = <Button variant="ghost" size="sm" className="mb-3" nativeButton={false} render={<Link to={withWorkspaceId(`/repositories/${repositoryId}`, workspaceId)} />}><ArrowLeft data-icon="inline-start" />{request?.repositoryFullName ?? 'Repository'}</Button>

  if (isLoading) return <>{backLink}<Skeleton className="h-64 w-full" aria-label="Loading pull request" /></>
  if (!request) return <>{backLink}<Alert variant="destructive"><AlertCircle /><AlertDescription>{error || 'This pull request could not be found.'}</AlertDescription></Alert></>

  return <>
    {backLink}
    <header className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{request.repositoryFullName}</span><span>#{request.number}</span><ReviewStateBadge state={request.state} isDraft={request.isDraft} />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>by {request.author.login}</span>
        <span className="flex items-center gap-1.5"><Badge variant="outline" className="font-mono">{request.sourceBranch}</Badge><ArrowRight aria-hidden="true" className="size-3.5" /><Badge variant="outline" className="font-mono">{request.targetBranch}</Badge></span>
        <span>Head <code className="font-mono">{shortSha(request.headSha)}</code></span>
        <a href={request.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">View on GitHub<ExternalLink aria-hidden="true" className="size-3.5" /></a>
      </div>
    </header>
    <section aria-label="Description" className="mb-8">
      {request.description.trim()
        ? <p className="max-w-3xl text-sm whitespace-pre-wrap">{request.description}</p>
        : <p className="text-sm text-muted-foreground">No description provided.</p>}
    </section>
    <ChangedFilesList files={request.files} summary={request.fileSummary} requestUrl={request.url} />
  </>
}
