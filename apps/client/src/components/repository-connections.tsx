import { useState } from 'react'
import { Link } from 'react-router'
import { AlertCircle, ChevronRight, GitBranch, LoaderCircle, Lock, Plus, RefreshCw, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LinkRepositoriesDialog } from '@/components/link-repositories-dialog'
import { RepositoryConnectCard } from '@/components/repository-connect-card'
import { formatRelative } from '@/libs/repositories/format'
import { useRepositoryConnectionActions, useRepositoryConnections } from '@/libs/repositories/hooks'
import { useIsWorkspaceAdmin } from '@/libs/workspaces/hooks'
import { withWorkspaceId } from '@/libs/workspaces/navigation'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { ConnectedRepository, RepositoryConnection, RepositorySyncStatus } from '@/libs/repositories'

const syncStatusBadges: Record<RepositorySyncStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  idle: { label: 'Not synced', variant: 'outline' },
  syncing: { label: 'Syncing', variant: 'secondary' },
  succeeded: { label: 'Synced', variant: 'default' },
  failed: { label: 'Sync failed', variant: 'destructive' },
}

export function RepositoryConnections() {
  const { isAdmin, isLoading: isAccessLoading } = useIsWorkspaceAdmin()
  const { connections, isLoading, error } = useRepositoryConnections()
  const { connect, isConnecting, sync, syncingConnectionId, disconnect, isDisconnecting } = useRepositoryConnectionActions()
  const [disconnectTarget, setDisconnectTarget] = useState<RepositoryConnection | null>(null)
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null)
  const connection = connections[0] ?? null

  async function startConnect() {
    try {
      const result = await connect()
      if (result.kind === 'redirect') window.location.assign(result.url)
      else toast.success('GitHub connected', { description: `${result.connection.repositories.filter((repository) => repository.isLinked).length} repositories are linked.` })
    } catch (cause) { toast.error('Could not connect GitHub', { description: message(cause) }) }
  }

  async function runSync(target: RepositoryConnection) {
    try {
      const synced = await sync(target.id)
      const failed = synced.repositories.filter((repository) => repository.syncStatus === 'failed').length
      if (failed) toast.warning('Sync finished with errors', { description: `${failed} ${failed === 1 ? 'repository' : 'repositories'} could not be synced.` })
      else toast.success('Sync complete')
    } catch (cause) { toast.error('Could not sync', { description: message(cause) }) }
  }

  async function confirmDisconnect() {
    if (!disconnectTarget) return
    try { await disconnect(disconnectTarget.id); toast.success('GitHub disconnected'); setDisconnectTarget(null) }
    catch (cause) { toast.error('Could not disconnect', { description: message(cause) }); setDisconnectTarget(null) }
  }

  return <>
    {!isAccessLoading && !isAdmin && <Alert className="mb-4"><Lock /><AlertDescription>Only workspace admins can connect, sync, or disconnect GitHub.</AlertDescription></Alert>}
    {error && <Alert variant="destructive" className="mb-4"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert>}
    {isLoading || isAccessLoading
      ? <Skeleton className="h-48 w-full" aria-label="Loading connections" />
      : connection
        ? <>
            <ConnectionPanel connection={connection} isAdmin={isAdmin} isSyncing={syncingConnectionId === connection.id} onAddRepositories={() => setLinkTargetId(connection.id)} onSync={() => void runSync(connection)} onDisconnect={() => setDisconnectTarget(connection)} />
            <RepositoryGrid repositories={connection.repositories.filter((repository) => repository.isLinked)} isAdmin={isAdmin} isSyncing={syncingConnectionId === connection.id} onAddRepositories={() => setLinkTargetId(connection.id)} />
          </>
        : <RepositoryConnectCard isAdmin={isAdmin} isConnecting={isConnecting} onConnect={() => void startConnect()} />}

    <LinkRepositoriesDialog connectionId={linkTargetId} onClose={() => setLinkTargetId(null)} />

    <AlertDialog open={Boolean(disconnectTarget)} onOpenChange={(open) => { if (!open && !isDisconnecting) setDisconnectTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect GitHub?</AlertDialogTitle>
          <AlertDialogDescription>{disconnectTarget?.accountLogin} will be disconnected and its imported pull requests removed from the review queue. Your policies are not affected. You can connect again at any time.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDisconnecting} onClick={() => void confirmDisconnect()}>{isDisconnecting ? 'Disconnecting…' : 'Disconnect'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}

type ConnectionPanelProps = { connection: RepositoryConnection; isAdmin: boolean; isSyncing: boolean; onAddRepositories: () => void; onSync: () => void; onDisconnect: () => void }

function ConnectionPanel({ connection, isAdmin, isSyncing, onAddRepositories, onSync, onDisconnect }: ConnectionPanelProps) {
  const lastSynced = latestSync(connection.repositories.filter((repository) => repository.isLinked))
  return <Card className="mb-6">
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><GitBranch aria-hidden="true" className="size-5" /></span>
          <div>
            <CardTitle className="flex items-center gap-2">GitHub · {connection.accountLogin}<Badge variant={connection.status === 'active' ? 'default' : 'destructive'}>{connection.status === 'active' ? 'Connected' : 'Suspended'}</Badge></CardTitle>
            <CardDescription>{connection.accountType === 'Organization' ? 'Organization' : 'Personal account'} · connected {formatRelative(connection.connectedAt)} · {lastSynced ? `last successful sync ${formatRelative(lastSynced)}` : 'not synced yet'}</CardDescription>
          </div>
        </div>
        {isAdmin && <div className="flex flex-wrap gap-2">
          <Button className="primary-action" disabled={isSyncing || connection.status !== 'active'} onClick={onAddRepositories}><Plus data-icon="inline-start" />Add repositories</Button>
          <Button variant="outline" disabled={isSyncing} onClick={onSync}>{isSyncing ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}{isSyncing ? 'Syncing…' : 'Sync now'}</Button>
          <Button variant="destructive" disabled={isSyncing} onClick={onDisconnect}><Unplug data-icon="inline-start" />Disconnect</Button>
        </div>}
      </div>
    </CardHeader>
  </Card>
}

export function RepositorySyncBadge({ status }: { status: RepositorySyncStatus }) {
  const badge = syncStatusBadges[status]
  return <Badge variant={badge.variant}>{badge.label}</Badge>
}

type RepositoryGridProps = { repositories: ConnectedRepository[]; isAdmin: boolean; isSyncing: boolean; onAddRepositories: () => void }

function RepositoryGrid({ repositories, isAdmin, isSyncing, onAddRepositories }: RepositoryGridProps) {
  const workspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId)
  if (!repositories.length) return <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
    <p className="text-sm text-muted-foreground">{isAdmin ? 'No repositories are linked to this workspace yet. Add one to start importing its pull requests.' : 'No repositories are linked to this workspace yet. Ask a workspace admin to add some.'}</p>
    {isAdmin && <Button variant="outline" onClick={onAddRepositories}><Plus data-icon="inline-start" />Add repositories</Button>}
  </div>
  return <section aria-label="Repositories">
    <h2 className="mb-3 text-sm font-medium text-muted-foreground">Repositories ({repositories.length})</h2>
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{repositories.map((repository) => <li key={repository.id}>
      <Link to={withWorkspaceId(`/repositories/${repository.id}`, workspaceId)} className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm text-muted-foreground">{repository.owner}</span>
            <span className="block truncate font-medium">{repository.name}</span>
          </span>
          <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RepositorySyncBadge status={isSyncing ? 'syncing' : repository.syncStatus} />
          {repository.isPrivate && <Badge variant="outline"><Lock />Private</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{repository.openRequestCount} open {repository.openRequestCount === 1 ? 'pull request' : 'pull requests'} · {repository.lastSyncedAt ? `synced ${formatRelative(repository.lastSyncedAt)}` : 'never synced'}</p>
        {repository.syncError && <p className="flex items-start gap-1 text-sm text-destructive"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span className="line-clamp-2">{repository.syncError}</span></p>}
      </Link>
    </li>)}</ul>
  </section>
}

function latestSync(repositories: ConnectedRepository[]) {
  return repositories.map((repository) => repository.lastSyncedAt).filter((value): value is string => value !== null).sort().at(-1) ?? null
}

function message(error: unknown) { return error instanceof Error ? error.message : 'Please try again.' }
