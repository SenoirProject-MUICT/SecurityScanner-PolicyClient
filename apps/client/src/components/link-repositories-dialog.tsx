import { useState } from 'react'
import { ExternalLink, LoaderCircle, Lock, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRepositoryConnectionActions, useRepositoryConnections } from '@/libs/repositories/hooks'
import type { RepositoryConnection } from '@/libs/repositories'

type LinkRepositoriesDialogProps = { connectionId: string | null; onClose: () => void }

export function LinkRepositoriesDialog({ connectionId, onClose }: LinkRepositoriesDialogProps) {
  const { isLinking } = useRepositoryConnectionActions()
  return <Dialog open={Boolean(connectionId)} onOpenChange={(open) => { if (!open && !isLinking) onClose() }}>
    <DialogContent className="sm:max-w-lg">
      {connectionId && <RepositoryPicker connectionId={connectionId} onClose={onClose} />}
    </DialogContent>
  </Dialog>
}

function RepositoryPicker({ connectionId, onClose }: { connectionId: string; onClose: () => void }) {
  const { connections } = useRepositoryConnections({ watchAccess: true })
  const { setLinkedRepositories, isLinking } = useRepositoryConnectionActions()
  const connection = connections.find((item) => item.id === connectionId)
  const [selected, setSelected] = useState(() => new Set(linkedIds(connection)))
  const [search, setSearch] = useState('')

  const repositories = connection?.repositories ?? []
  const term = search.trim().toLowerCase()
  const visible = term ? repositories.filter((repository) => repository.fullName.toLowerCase().includes(term)) : repositories
  const linked = new Set(linkedIds(connection))
  const adding = repositories.filter((repository) => selected.has(repository.id) && !linked.has(repository.id)).length
  const removing = repositories.filter((repository) => !selected.has(repository.id) && linked.has(repository.id)).length

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    if (!connection) return
    // Ids the App can no longer see are dropped rather than sent, so a repository removed on GitHub meanwhile does not fail the save.
    const repositoryIds = repositories.filter((repository) => selected.has(repository.id)).map((repository) => repository.id)
    try {
      await setLinkedRepositories({ connectionId: connection.id, repositoryIds })
      toast.success('Repositories updated', { description: summary(adding, removing) })
      onClose()
    } catch (cause) { toast.error('Could not update repositories', { description: cause instanceof Error ? cause.message : 'Please try again.' }) }
  }

  if (!connection) return <DialogHeader><DialogTitle>Choose repositories</DialogTitle><DialogDescription>This GitHub connection could not be found. Close this dialog and refresh the page.</DialogDescription></DialogHeader>

  return <>
    <DialogHeader>
      <DialogTitle>Choose repositories</DialogTitle>
      <DialogDescription>Choose which repositories from {connection.accountLogin} appear in this workspace. Pull requests are imported from linked repositories only.</DialogDescription>
    </DialogHeader>

    {repositories.length > 0 && <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label="Search repositories" placeholder="Search repositories" className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} />
    </div>}

    {repositories.length === 0
      ? <p className="rounded-lg border border-dashed p-4 text-muted-foreground">The GitHub App cannot see any repositories in {connection.accountLogin} yet. Give it access on GitHub, and they will appear here.</p>
      : <ul aria-label="Repositories" className="-mx-1 flex max-h-80 flex-col overflow-y-auto">
          {visible.map((repository) => <li key={repository.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 hover:bg-muted/50">
              <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={selected.has(repository.id)} onChange={() => toggle(repository.id)} disabled={isLinking} />
              <span className="min-w-0 flex-1 truncate"><span className="text-muted-foreground">{repository.owner}/</span><span className="font-medium">{repository.name}</span></span>
              {repository.isPrivate && <Badge variant="outline"><Lock />Private</Badge>}
            </label>
          </li>)}
          {visible.length === 0 && <li className="px-1 py-2 text-muted-foreground">No repositories match “{search.trim()}”.</li>}
        </ul>}

    <p className="text-muted-foreground">
      Missing a repository?{' '}
      <a href={connection.manageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-3">Give the GitHub App access<ExternalLink aria-hidden="true" className="size-3.5" /></a>
      {' '}It shows up here once you save on GitHub.
    </p>

    {removing > 0 && <p className="text-destructive">Unlinking removes {removing === 1 ? 'that repository’s' : `those ${removing} repositories’`} imported pull requests from the review queue. You can link {removing === 1 ? 'it' : 'them'} again later.</p>}

    <DialogFooter>
      <Button variant="outline" disabled={isLinking} onClick={onClose}>Cancel</Button>
      <Button className="primary-action" disabled={isLinking || (adding === 0 && removing === 0)} onClick={() => void save()}>
        {isLinking && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
        {isLinking ? 'Saving…' : saveLabel(adding, removing)}
      </Button>
    </DialogFooter>
  </>
}

function linkedIds(connection: RepositoryConnection | undefined) {
  return (connection?.repositories ?? []).filter((repository) => repository.isLinked).map((repository) => repository.id)
}

function saveLabel(adding: number, removing: number) {
  if (adding && !removing) return `Link ${plural(adding)}`
  if (removing && !adding) return `Unlink ${plural(removing)}`
  return 'Save changes'
}

function summary(adding: number, removing: number) {
  return [adding && `Importing pull requests from ${plural(adding)}.`, removing && `Unlinked ${plural(removing)}.`].filter(Boolean).join(' ')
}

function plural(count: number) { return `${count} ${count === 1 ? 'repository' : 'repositories'}` }
