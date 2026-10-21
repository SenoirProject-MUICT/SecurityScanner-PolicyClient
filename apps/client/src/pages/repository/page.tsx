import { Link, useParams } from 'react-router'
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GithubIcon } from '@/components/github-icon'
import { RepositorySyncBadge } from '@/components/repository-connections'
import { ReviewQueue } from '@/components/review-queue'
import { formatRelative } from '@/libs/repositories/format'
import { useRepositoryConnections } from '@/libs/repositories/hooks'
import { withWorkspaceId } from '@/libs/workspaces/navigation'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function RepositoryPage() {
  const { repositoryId } = useParams()
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  const { connections, isLoading, error } = useRepositoryConnections()
  const repository = connections.flatMap((connection) => connection.repositories).find((item) => item.id === repositoryId)
  const backLink = <Button variant="ghost" size="sm" className="mb-3" nativeButton={false} render={<Link to={withWorkspaceId('/repositories', workspaceId)} />}><ArrowLeft data-icon="inline-start" />Repositories</Button>

  if (isLoading) return <>{backLink}<Skeleton className="h-64 w-full" aria-label="Loading repository" /></>
  if (!repository) return <>{backLink}<Alert variant="destructive"><AlertCircle /><AlertDescription>{error || 'This repository is no longer connected. It may have been removed from the GitHub installation.'}</AlertDescription></Alert></>

  return <>
    {backLink}
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm text-muted-foreground">{repository.owner}</span>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          {repository.name}
          {repository.isPrivate && <Badge variant="outline"><Lock />Private</Badge>}
          <RepositorySyncBadge status={repository.syncStatus} />
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Default branch <code className="font-mono">{repository.defaultBranch}</code></span>
          <span>{repository.lastSyncedAt ? `Synced ${formatRelative(repository.lastSyncedAt)}` : 'Never synced'}</span>
        </div>
        {repository.syncError && <p className="flex items-start gap-1 text-sm text-destructive"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{repository.syncError}</p>}
      </div>
      <Button variant="outline" size="lg" className="h-11 gap-2 px-5 text-base" nativeButton={false} render={<a href={repository.url} target="_blank" rel="noreferrer" aria-label={`Open ${repository.fullName} on GitHub`} />}><GithubIcon className="size-5" />GitHub</Button>
    </header>
    <ReviewQueue repositoryId={repository.id} />
  </>
}
