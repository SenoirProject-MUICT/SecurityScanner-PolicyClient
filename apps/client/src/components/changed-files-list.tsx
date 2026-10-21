import { useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/libs/utils'
import { groupChangedFiles, parseDiffLines, type DiffLineKind } from '@/libs/repositories/files'
import type { ChangedFile, ChangedFileSummary } from '@/libs/repositories'

const PATCH_LINE_LIMIT = 400
const diffLineStyles: Record<DiffLineKind, string> = {
  hunk: 'bg-muted text-muted-foreground',
  added: 'bg-primary/10 text-foreground',
  removed: 'bg-destructive/10 text-destructive',
  context: 'text-muted-foreground',
}

type ChangedFilesListProps = { files: ChangedFile[]; summary: ChangedFileSummary; requestUrl: string }

export function ChangedFilesList({ files, summary, requestUrl }: ChangedFilesListProps) {
  const groups = groupChangedFiles(files)
  return <section aria-labelledby="changed-files-heading" className="flex flex-col gap-4">
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 id="changed-files-heading" className="text-lg font-semibold">Changed files</h2>
      <p className="text-sm text-muted-foreground">
        {summary.total} {summary.total === 1 ? 'file' : 'files'}
        {groups.map((group) => ` · ${summary[group.status]} ${group.label.toLowerCase()}`).join('')}
        {' · '}<span className="font-mono text-primary">+{summary.additions}</span> <span className="font-mono text-destructive">−{summary.deletions}</span>
      </p>
    </div>
    {groups.length === 0 && <p className="text-sm text-muted-foreground">No changed files were imported for this pull request.</p>}
    {groups.map((group) => <div key={group.status} className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{group.label} ({group.files.length})</h3>
      <ul className="flex flex-col gap-2">{group.files.map((file) => <li key={file.id}><ChangedFileRow file={file} requestUrl={requestUrl} /></li>)}</ul>
    </div>)}
  </section>
}

function ChangedFileRow({ file, requestUrl }: { file: ChangedFile; requestUrl: string }) {
  const [open, setOpen] = useState(false)
  const panelId = `patch-${file.id}`
  return <div className="rounded-lg border bg-card text-card-foreground">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      <ChevronRight aria-hidden="true" className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')} />
      <span className="min-w-0 flex-1 break-all font-mono">
        {file.previousPath ? <><span className="text-muted-foreground">{file.previousPath}</span> → {file.path}</> : file.path}
      </span>
      <Badge variant="outline" className="font-mono text-primary">+{file.additions}</Badge>
      <Badge variant="outline" className="font-mono text-destructive">−{file.deletions}</Badge>
    </button>
    {open && <div id={panelId} className="border-t">
      {file.patch === null
        ? <p className="flex flex-wrap items-center gap-2 p-3 text-sm text-muted-foreground">The diff is not available for this file. GitHub does not return a patch for binary or very large files.
            <a href={requestUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">View it on GitHub<ExternalLink aria-hidden="true" className="size-3.5" /></a></p>
        : <PatchPreview patch={file.patch} requestUrl={requestUrl} />}
    </div>}
  </div>
}

function PatchPreview({ patch, requestUrl }: { patch: string; requestUrl: string }) {
  const lines = parseDiffLines(patch)
  const visible = lines.slice(0, PATCH_LINE_LIMIT)
  return <>
    <pre className="overflow-x-auto py-1 font-mono text-xs leading-5" aria-label="Patch preview">{visible.map((line, index) => <code key={index} className={cn('block min-w-max px-3 whitespace-pre', diffLineStyles[line.kind])}>{line.text || ' '}</code>)}</pre>
    {lines.length > visible.length && <p className="border-t p-3 text-sm text-muted-foreground">Showing the first {PATCH_LINE_LIMIT} of {lines.length} lines. <a href={requestUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">View the full diff on GitHub</a></p>}
  </>
}
