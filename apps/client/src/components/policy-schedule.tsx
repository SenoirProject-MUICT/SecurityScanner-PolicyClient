import { useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePolicies } from '@/stores/policy-store'
import { PolicyLabelBadge } from '@/components/policy-label-badge'
import { PolicyStatusBadge } from '@/components/policy-status-badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { getPolicyLifecycle, toDateKey, type Policy } from '@/libs/policies'
import { Select } from '@base-ui/react/select'

const WEEKDAYS = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, index + 7)))

export function PolicySchedule({ isLoading = false }: { isLoading?: boolean }) {
  const { policies } = usePolicies()
  const navigate = useNavigate()
  const [viewMonth, setViewMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const today = startOfDay(new Date())
  const todayKey = toDateKey(today)
  const monthStart = viewMonth
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  const visibleStart = addDays(monthStart, -monthStart.getDay())
  const visibleDayCount = Math.ceil((monthStart.getDay() + monthEnd.getDate()) / 7) * 7
  const visibleDays = Array.from({ length: visibleDayCount }, (_, index) => addDays(visibleStart, index))
  const weeks = Array.from({ length: visibleDayCount / 7 }, (_, index) => visibleDays.slice(index * 7, index * 7 + 7))
  const firstDay = toDateKey(visibleDays[0])
  const lastDay = toDateKey(visibleDays[visibleDays.length - 1])
  const scheduledPolicies = policies
    .filter((policy) => (policy.effectiveFrom || policy.effectiveUntil) && overlapsMonth(policy, firstDay, lastDay))
    .sort((left, right) => (left.effectiveFrom ?? firstDay).localeCompare(right.effectiveFrom ?? firstDay) || left.name.localeCompare(right.name))
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(monthStart)
  const years = Array.from({ length: 21 }, (_, index) => today.getFullYear() - 10 + index)
  const months = Array.from({ length: 12 }, (_, index) => ({ value: String(index), label: new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2024, index, 1)) }))
  const selectMonth = (month: string | null) => { if (month !== null) setViewMonth(new Date(viewMonth.getFullYear(), Number(month), 1)) }
  const selectYear = (year: string | null) => { if (year !== null) setViewMonth(new Date(Number(year), viewMonth.getMonth(), 1)) }
  const shiftMonth = (amount: number) => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + amount, 1))
  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId)

  return <Card className="schedule-card">
    <CardHeader className="schedule-heading">
      <div><CardTitle>Policy schedule</CardTitle><CardDescription>Browse policy date ranges month by month.</CardDescription></div>
      <div className="schedule-range-controls"><button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft /></button>
        <ScheduleSelect ariaLabel="Schedule month" value={String(viewMonth.getMonth())} items={months} onChange={selectMonth} />
        <ScheduleSelect ariaLabel="Schedule year" value={String(viewMonth.getFullYear())} items={years.map((year) => ({ value: String(year), label: String(year) }))} onChange={selectYear} />
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight /></button></div>
    </CardHeader>
    <CardContent>
      <div className="schedule-content-layout">
      <TooltipProvider delay={350}>
      <div className="schedule-scroll" role="region" aria-label={`Policy calendar for ${monthLabel}`} tabIndex={0}>
        {isLoading ? <div className="calendar-loading" aria-label="Loading schedule"><div className="calendar-loading-weekdays">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} />)}</div>{Array.from({ length: 5 }, (_, week) => <div className="calendar-loading-week" key={week}>{Array.from({ length: 7 }, (_, day) => <Skeleton key={day} />)}</div>)}</div> : <>
        <div className="calendar-month-grid">
          <div className="calendar-weekdays">{WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
          <div className="calendar-weeks">{weeks.map((week) => {
            const segments = getWeekSegments(week, scheduledPolicies)
            const trackCount = Math.max(segments.length ? Math.max(...segments.map((segment) => segment.track)) + 1 : 0, 1)
            return <div className="calendar-week" key={toDateKey(week[0])} style={{ gridTemplateRows: `34px repeat(${trackCount}, 34px)` }}>
              {week.map((day, index) => <div className={`calendar-day ${index === 6 ? 'is-last-day' : ''} ${day.getMonth() === monthStart.getMonth() ? '' : 'is-outside'} ${toDateKey(day) === todayKey ? 'is-today' : ''}`} key={toDateKey(day)} style={{ gridColumn: index + 1, gridRow: `1 / ${trackCount + 2}` }}><span>{day.getDate()}</span></div>)}
              {segments.map(({ policy, start, end, track }) => <Tooltip key={`${policy.id}-${toDateKey(week[0])}`}>
                <TooltipTrigger render={<button type="button" className={`schedule-bar is-${getPolicyLifecycle(policy)} ${selectedPolicyId === policy.id ? 'is-selected' : ''}`} style={{ gridColumn: `${start + 1} / ${end + 1}`, gridRow: track + 2 }} aria-label={`${policy.name}, ${getPolicyLifecycle(policy)}, ${formatDateRange(policy.effectiveFrom, policy.effectiveUntil)}. Show schedule details`} onClick={() => setSelectedPolicyId(policy.id)} />}><span>{policy.name}</span></TooltipTrigger>
                <TooltipContent className="schedule-tooltip"><strong>{policy.name}</strong><span>{formatDateRange(policy.effectiveFrom, policy.effectiveUntil)}</span><span className="schedule-tooltip-status">{getPolicyLifecycle(policy)}</span></TooltipContent>
              </Tooltip>)}
            </div>
          })}</div>
        </div>
        {!scheduledPolicies.length && <p className="schedule-month-empty">No date-ranged policies this month.</p>}
        </>}
      </div>
      </TooltipProvider>
      <aside className="schedule-detail-panel" aria-live="polite">
        {isLoading ? <div className="schedule-detail-loading" aria-label="Loading policy details"><Skeleton className="loading-detail-label" /><Skeleton className="loading-detail-title" /><Skeleton className="loading-detail-copy" /><Skeleton className="loading-detail-copy short" /></div> : selectedPolicy ? <>
          <div className="schedule-detail-topline"><span>POLICY DETAILS</span><button type="button" aria-label="Clear selected policy" onClick={() => setSelectedPolicyId(null)}>×</button></div>
          <h3>{selectedPolicy.name}</h3>
          <PolicyStatusBadge policy={selectedPolicy} />
          <p className="schedule-detail-description">{selectedPolicy.description || 'No summary provided.'}</p>
          <dl className="schedule-detail-facts"><div><dt>Effective</dt><dd>{formatDateRange(selectedPolicy.effectiveFrom, selectedPolicy.effectiveUntil)}</dd></div><div><dt>Owner</dt><dd>{selectedPolicy.createdBy}</dd></div></dl>
          {selectedPolicy.labels.length > 0 && <div className="schedule-detail-labels">{selectedPolicy.labels.map((label) => <PolicyLabelBadge label={label} key={label} />)}</div>}
          <Button variant="outline" size="sm" className="schedule-open-policy" onClick={() => navigate(`/policies/${selectedPolicy.id}`)}>Open policy <ArrowUpRight data-icon="inline-end" /></Button>
        </> : <div className="schedule-detail-empty"><span>POLICY DETAILS</span><p>Select a policy on the calendar to see its dates, status, and labels.</p></div>}
      </aside>
      </div>
      <div className="schedule-footer"><span><i className="schedule-dot is-active" />Active</span><span><i className="schedule-dot is-scheduled" />Scheduled</span><span><i className="schedule-dot is-draft" />Draft</span><span><i className="schedule-dot is-inactive" />Off</span><Button variant="ghost" size="sm" onClick={() => navigate('/policies')}>View policies</Button></div>
    </CardContent>
  </Card>
}

function getWeekSegments(week: Date[], policies: Policy[]) {
  const weekStart = toDateKey(week[0])
  const weekEnd = toDateKey(week[6])
  const ranges = policies.flatMap((policy) => {
    const rangeStart = policy.effectiveFrom && policy.effectiveFrom > weekStart ? policy.effectiveFrom : weekStart
    const rangeEnd = policy.effectiveUntil && policy.effectiveUntil < weekEnd ? policy.effectiveUntil : weekEnd
    if (rangeStart > rangeEnd) return []
    return [{ policy, start: differenceInDays(parseDateKey(rangeStart), week[0]), end: differenceInDays(parseDateKey(rangeEnd), week[0]) + 1 }]
  }).sort((left, right) => left.start - right.start || left.end - right.end || left.policy.name.localeCompare(right.policy.name))

  const trackEnds: number[] = []
  return ranges.map((range) => {
    let track = trackEnds.findIndex((end) => end <= range.start)
    if (track < 0) track = trackEnds.length
    trackEnds[track] = range.end
    return { ...range, track }
  })
}

function overlapsMonth(policy: Policy, firstDay: string, lastDay: string) {
  return (!policy.effectiveUntil || policy.effectiveUntil >= firstDay) && (!policy.effectiveFrom || policy.effectiveFrom <= lastDay)
}
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(date.getDate() + days); return next }
function parseDateKey(value: string) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
function differenceInDays(left: Date, right: Date) { return Math.round((left.getTime() - right.getTime()) / 86400000) }
function formatDateRange(from: string | null, until: string | null) { return `${from ? formatShort(parseDateKey(from)) : 'Any date'} – ${until ? formatShort(parseDateKey(until)) : 'No end'}` }
function formatShort(date: Date) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date) }

function ScheduleSelect({ ariaLabel, value, items, onChange }: { ariaLabel: string; value: string; items: { value: string; label: string }[]; onChange: (value: string | null) => void }) {
  const selected = items.find((item) => item.value === value)?.label ?? value
  return <Select.Root value={value} onValueChange={onChange}>
    <Select.Trigger className="schedule-select-trigger" aria-label={ariaLabel}><Select.Value>{selected}</Select.Value><Select.Icon><ChevronRight className="schedule-select-chevron" /></Select.Icon></Select.Trigger>
    <Select.Portal><Select.Positioner className="schedule-select-positioner" sideOffset={6}><Select.Popup className="schedule-select-popup"><Select.List>{items.map((item) => <Select.Item key={item.value} value={item.value} className="schedule-select-item"><Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator>✓</Select.ItemIndicator></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal>
  </Select.Root>
}
