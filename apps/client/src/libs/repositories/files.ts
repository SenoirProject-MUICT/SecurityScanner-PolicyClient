import type { ChangedFile, ChangedFileStatus } from './types'

/** One table drives group order and labels, so adding a status is a one-line change. */
export const changedFileStatusMeta: Record<ChangedFileStatus, { label: string; order: number }> = {
  added: { label: 'Added', order: 0 },
  modified: { label: 'Modified', order: 1 },
  removed: { label: 'Removed', order: 2 },
  renamed: { label: 'Renamed', order: 3 },
}

export type ChangedFileGroup = { status: ChangedFileStatus; label: string; files: ChangedFile[] }

const orderedStatuses = (Object.keys(changedFileStatusMeta) as ChangedFileStatus[]).sort((a, b) => changedFileStatusMeta[a].order - changedFileStatusMeta[b].order)

export function groupChangedFiles(files: ChangedFile[]): ChangedFileGroup[] {
  return orderedStatuses
    .map((status) => ({ status, label: changedFileStatusMeta[status].label, files: files.filter((file) => file.status === status) }))
    .filter((group) => group.files.length > 0)
}

export type DiffLineKind = 'hunk' | 'added' | 'removed' | 'context'
export type DiffLine = { kind: DiffLineKind; text: string }

const diffLinePrefixes: Array<[prefix: string, kind: DiffLineKind]> = [['@@', 'hunk'], ['+', 'added'], ['-', 'removed']]

export function parseDiffLines(patch: string): DiffLine[] {
  return patch.split('\n').map((text) => ({ kind: diffLinePrefixes.find(([prefix]) => text.startsWith(prefix))?.[1] ?? 'context', text }))
}
