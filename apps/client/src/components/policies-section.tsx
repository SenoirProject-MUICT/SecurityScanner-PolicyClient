import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowRight, Check, FileText, LayoutGrid, List, Plus, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Command } from 'cmdk'
import { Popover } from '@base-ui/react/popover'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeading } from '@/components/app-shell'
import { PolicyStatusBadge } from '@/components/policy-status-badge'
import { getPolicyLifecycle, type Policy } from '@/libs/policies'
import { Skeleton } from '@/components/ui/skeleton'
import { useLabels } from '@/libs/labels/hooks'
import { PolicyLabelBadge } from '@/components/policy-label-badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const PAGE_SIZE = 8
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
] as const

export function PoliciesSection({ policies, isLoading, loadError, onOpenPolicy, onCreate }: {
  policies: Policy[]
  isLoading: boolean
  loadError: string
  onOpenPolicy: (policy: Policy) => void
  onCreate: () => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { labels } = useLabels()
  const query = searchParams.get('q') ?? ''
  const statusParam = searchParams.get('status')
  const selectedStatus = statusOptions.find((option) => option.value === statusParam)?.value ?? ''
  const selectedLabels = useMemo(() => searchParams.getAll('label'), [searchParams])
  const labelFilterText = selectedLabels.length === 0 ? 'All labels' : selectedLabels.length === 1 ? selectedLabels[0] : `${selectedLabels.length} labels selected`
  const statusFilterText = statusOptions.find((option) => option.value === selectedStatus)?.label ?? 'All statuses'
  const [pageIndex, setPageIndex] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false)
  const [labelQuery, setLabelQuery] = useState('')
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    return policies.filter((policy) => {
      const matchesLabel = selectedLabels.length === 0 || selectedLabels.some((label) => policy.labels.includes(label))
      const matchesStatus = !selectedStatus || getPolicyLifecycle(policy) === selectedStatus
      const matchesSearch = !search || [policy.name, policy.description, ...policy.labels, policy.createdBy].join(' ').toLocaleLowerCase().includes(search)
      return matchesLabel && matchesStatus && matchesSearch
    })
  }, [policies, query, selectedLabels, selectedStatus])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)

  function changeFilter(key: 'q' | 'status', value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
    setPageIndex(0)
  }
  function toggleLabel(label: string) {
    const next = new URLSearchParams(searchParams)
    const selected = next.getAll('label')
    next.delete('label')
    const updated = selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label]
    updated.forEach((item) => next.append('label', item))
    setSearchParams(next, { replace: true })
    setPageIndex(0)
  }
  function clearLabelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('label')
    setSearchParams(next, { replace: true })
    setPageIndex(0)
  }
  function changeStatusFilter(value: string) {
    changeFilter('status', value)
    setStatusPopoverOpen(false)
  }
  function clearFilters() { setSearchParams({}, { replace: true }); setPageIndex(0) }

  return <>
    <SectionHeading eyebrow="POLICY LIBRARY" title="All policies" description="Browse, search, and manage your team’s policies." action={<Button className="primary-action" onClick={onCreate}><Plus size={16} /> New policy</Button>} />
    {loadError && <div className="inline-alert" role="alert"><ShieldCheck size={16} /> Could not load your policies: {loadError}</div>}
    <section className="library-toolbar">
      <div className="library-count"><strong>{isLoading ? '—' : filtered.length}</strong> {filtered.length === 1 ? 'policy' : 'policies'}<span>in your library</span></div>
      <label className="catalog-search"><Search size={16} /><span className="sr-only">Search policies</span><Input value={query} onChange={(event) => changeFilter('q', event.target.value)} placeholder="Search by name, label, or keyword" />{query && <button type="button" onClick={() => changeFilter('q', '')} aria-label="Clear search">×</button>}</label>
      <Popover.Root open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
        <Popover.Trigger className={`catalog-label-trigger ${selectedStatus ? 'has-label-filter' : ''}`} aria-label={`Filter by status: ${statusFilterText}`}><span className="catalog-label-trigger-copy"><small>Status</small><strong>{statusFilterText}</strong></span><SlidersHorizontal aria-hidden="true" /></Popover.Trigger>
        <Popover.Portal><Popover.Positioner side="bottom" align="end" sideOffset={7} className="catalog-label-positioner"><Popover.Popup className="catalog-label-popover"><Command className="catalog-label-command" label="Filter policies by status"><Command.List className="catalog-label-options"><Command.Group heading="STATUS"><Command.Item value="All statuses" onSelect={() => changeStatusFilter('')} className="catalog-label-option" aria-pressed={!selectedStatus}><span>All statuses</span><span className="catalog-option-check">{!selectedStatus && <Check aria-hidden="true" />}</span></Command.Item>{statusOptions.map((option) => <Command.Item key={option.value} value={option.label} onSelect={() => changeStatusFilter(option.value)} className="catalog-label-option" aria-pressed={selectedStatus === option.value}><span>{option.label}</span><span className="catalog-option-check">{selectedStatus === option.value && <Check aria-hidden="true" />}</span></Command.Item>)}</Command.Group></Command.List></Command></Popover.Popup></Popover.Positioner></Popover.Portal>
      </Popover.Root>
      <Popover.Root open={labelPopoverOpen} onOpenChange={(open) => { setLabelPopoverOpen(open); if (!open) setLabelQuery('') }}>
        <Popover.Trigger className={`catalog-label-trigger ${selectedLabels.length ? 'has-label-filter' : ''}`} aria-label={`Filter by label: ${labelFilterText}`}><span className="catalog-label-trigger-copy"><small>Label</small><strong>{labelFilterText}</strong></span><SlidersHorizontal aria-hidden="true" /></Popover.Trigger>
        <Popover.Portal><Popover.Positioner side="bottom" align="end" sideOffset={7} className="catalog-label-positioner"><Popover.Popup className="catalog-label-popover"><Command className="catalog-label-command" label="Filter policies by label" shouldFilter>
          <label className="catalog-label-search"><Search aria-hidden="true" /><Command.Input autoFocus value={labelQuery} onValueChange={setLabelQuery} placeholder="Search labels…" aria-label="Search labels" /></label>
          <Command.List className="catalog-label-options"><Command.Empty className="catalog-label-empty">{labels.length ? 'No labels match your search.' : 'No labels yet.'}</Command.Empty>
            <Command.Group heading="LABELS"><Command.Item value="All labels" onSelect={clearLabelFilter} className="catalog-label-option" aria-pressed={selectedLabels.length === 0}><span>All labels</span><span className="catalog-option-check">{selectedLabels.length === 0 && <Check aria-hidden="true" />}</span></Command.Item>{labels.map((label) => { const selected = selectedLabels.includes(label); return <Command.Item key={label} value={label} onSelect={() => toggleLabel(label)} className="catalog-label-option" aria-pressed={selected}><span>{label}</span><span className="catalog-option-check">{selected && <Check aria-hidden="true" />}</span></Command.Item> })}</Command.Group>
          </Command.List>
          <div className="catalog-label-footer"><span>{selectedLabels.length} selected</span><button type="button" disabled={!selectedLabels.length} onClick={clearLabelFilter}>Clear</button><div className="catalog-label-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate <kbd>↵</kbd> toggle</div></div>
        </Command></Popover.Popup></Popover.Positioner></Popover.Portal>
      </Popover.Root>
      <span className="sort-label"><SlidersHorizontal size={14} /> Recently updated</span>
      <ToggleGroup className="policy-view-switcher" variant="outline" value={[view]} onValueChange={(values) => { if (values[0] === 'grid' || values[0] === 'list') setView(values[0]) }} aria-label="Policy view">
        <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid view"><LayoutGrid /></ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view" title="List view"><List /></ToggleGroupItem>
      </ToggleGroup>
    </section>
    {isLoading ? <div className={view === 'grid' ? 'catalog-grid' : 'catalog-list'} aria-label="Loading policies">{[0, 1, 2, 3, 4, 5].map((index) => <Card className="catalog-card" key={index}><CardContent><Skeleton className="catalog-skeleton" /></CardContent></Card>)}</div> : visible.length ? <div className={view === 'grid' ? 'catalog-grid' : 'catalog-list'}>
      {visible.map((policy) => view === 'grid' ? <Card className="catalog-card" key={policy.id} role="link" tabIndex={0} onClick={() => onOpenPolicy(policy)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenPolicy(policy) } }}><CardContent>
          <div className="catalog-topline"><PolicyStatusBadge policy={policy} /><ArrowRight className="catalog-arrow" size={15} /></div>
          <strong className="catalog-title">{policy.name}</strong>
          <span className="catalog-description">{policy.description || 'A policy with no summary yet.'}</span>
          <span className="catalog-labels">{policy.labels.slice(0, 3).map((label) => <PolicyLabelBadge label={label} key={label} />)}</span>
          <span className="catalog-date"><FileText size={14} /> <span>Created by <strong>{policy.createdBy}</strong></span><i /> Updated {formatDate(policy.updatedAt)}</span>
        </CardContent></Card> : <button type="button" className="catalog-list-row" key={policy.id} onClick={() => onOpenPolicy(policy)}>
          <span className="catalog-list-main"><strong>{policy.name}</strong><small>{policy.description || 'A policy with no summary yet.'}</small></span><span className="catalog-list-labels">{policy.labels.slice(0, 3).map((label) => <PolicyLabelBadge label={label} key={label} />)}</span><span className="catalog-list-author"><small>Created by</small><strong>{policy.createdBy}</strong></span><PolicyStatusBadge policy={policy} /><span className="catalog-list-updated">Updated {formatDate(policy.updatedAt)}</span><ArrowRight className="catalog-arrow" size={15} />
        </button>)}
    </div> : <div className="empty-library"><span className="empty-library-icon"><FileText size={21} /></span><h2>{query || selectedLabels.length || selectedStatus ? 'No policies found' : 'Your library is ready'}</h2><p>{query || selectedLabels.length || selectedStatus ? 'Try another search or filter, or clear the filters.' : 'Create your first policy to start building your library.'}</p>{query || selectedLabels.length || selectedStatus ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : <Button className="primary-action" onClick={onCreate}><Plus size={15} /> Create first policy</Button>}</div>}
    {!isLoading && filtered.length > PAGE_SIZE && <div className="pagination"><span>Showing {pageIndex * PAGE_SIZE + 1}–{Math.min((pageIndex + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div><Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => current - 1)}>Previous</Button><span className="pagination-page">{pageIndex + 1} / {pageCount}</span><Button variant="outline" size="sm" disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex((current) => current + 1)}>Next <ArrowRight size={13} /></Button></div></div>}
  </>
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'recently' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date) }
