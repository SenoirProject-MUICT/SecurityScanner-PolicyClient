import { useEffect, useMemo, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router'
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { Activity, ArrowRight, CalendarPlus, FileText, Plus, ShieldCheck, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { PolicyEditorDialog } from '@/components/policy-editor-dialog'
import { PolicyStatusBadge } from '@/components/policy-status-badge'
import { PolicySchedule } from '@/components/policy-schedule'
import { SectionHeading } from '@/components/app-shell'
import { usePolicies } from '@/stores/policy-store'
import { useAuth } from '@/stores/auth-store'
import { useLabels } from '@/stores/label-store'
import { getPolicyLifecycle, type PolicyActivityType, type PolicyDraftInput } from '@/libs/policies'
import { toast } from 'sonner'
import { PolicyLabelBadge } from '@/components/policy-label-badge'
import { Skeleton } from '@/components/ui/skeleton'

const activityConfig = { added: { label: 'Added', color: '#568666' }, removed: { label: 'Removed', color: '#bd6c62' }, draft: { label: 'Draft', color: '#c4a46f' }, scheduled: { label: 'Scheduled', color: '#7896b6' }, total: { label: 'Total policies', color: '#3e6590' } } satisfies ChartConfig
const statusConfig = { active: { label: 'Active', color: '#568666' }, scheduled: { label: 'Scheduled', color: '#7896b6' }, inactive: { label: 'Inactive', color: '#c5cfca' }, draft: { label: 'Draft', color: '#c4a46f' } } satisfies ChartConfig

export function OverviewPage() {
  const { policies, activity, isLoading, error, create } = usePolicies()
  const { user } = useAuth()
  const { labels, isLoading: labelsLoading } = useLabels()
  const navigate = useNavigate()
  const [editorOpen, setEditorOpen] = useState(false)
  const [activityRange, setActivityRange] = useState('7')
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const refreshClock = () => setNow(dayjs())
    const interval = window.setInterval(refreshClock, 30_000)
    window.addEventListener('focus', refreshClock)
    document.addEventListener('visibilitychange', refreshClock)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshClock)
      document.removeEventListener('visibilitychange', refreshClock)
    }
  }, [])
  const addedToday = policies.filter((policy) => dayjs(policy.createdAt).isSame(now, 'day')).length
  const activeCount = policies.filter((policy) => getPolicyLifecycle(policy) === 'active').length
  const scheduledCount = policies.filter((policy) => getPolicyLifecycle(policy) === 'scheduled').length
  const inactiveCount = policies.filter((policy) => getPolicyLifecycle(policy) === 'inactive').length
  const draftCount = policies.filter((policy) => getPolicyLifecycle(policy) === 'draft').length
  const trend = useMemo(() => buildActivityTrend(policies, activity, Number(activityRange)), [policies, activity, activityRange])
  const activityTotals = trend.reduce((totals, day) => ({ added: totals.added + day.added, removed: totals.removed + day.removed, draft: totals.draft + day.draft, scheduled: totals.scheduled + day.scheduled }), { added: 0, removed: 0, draft: 0, scheduled: 0 })
  const statusData = [{ name: 'active', count: activeCount }, { name: 'scheduled', count: scheduledCount }, { name: 'inactive', count: inactiveCount }, { name: 'draft', count: draftCount }]

  async function save(input: PolicyDraftInput) {
    try {
      const policy = await create(input)
      setEditorOpen(false)
      toast.success('Policy created', { description: policy.name })
      navigate(`/policies/${policy.id}`)
      return policy
    } catch (cause) { toast.error('Could not create policy', { description: getMessage(cause) }); throw cause }
  }

  const recent = [...policies].slice(0, 5)
  return <>
    <SectionHeading eyebrow="POLICY INTELLIGENCE" title={`Good ${timeOfDay(now)}, ${firstName(user?.name)}.`} description={isLoading ? 'Getting your policy workspace ready.' : `${policies.length} ${policies.length === 1 ? 'policy' : 'policies'} in your library · ${activeCount} currently active.`} action={<Button className="primary-action" onClick={() => setEditorOpen(true)}><Plus data-icon="inline-start" /> Create policy</Button>} />
    {error && <div className="page-alert" role="alert">{error}</div>}
    <section className="dashboard-stats" aria-label="Policy activity">
      <Metric icon={<FileText />} label="Total policies" value={policies.length} note="Across your library" isLoading={isLoading} />
      <Metric icon={<CalendarPlus />} label="Added today" value={addedToday} note="New policies today" isLoading={isLoading} />
      <Metric icon={<ShieldCheck />} label="Currently active" value={activeCount} note="In their effective dates" isLoading={isLoading} />
      <Metric icon={<UsersRound />} label="Created by you" value={policies.filter((policy) => policy.ownerId === user?.id).length} note={user?.name ?? 'Your account'} isLoading={isLoading} />
    </section>
    <section className="dashboard-lower-grid">
      <Card className="recent-card"><CardHeader className="dashboard-card-heading"><div><CardTitle>Recently updated</CardTitle><CardDescription>The latest changes from your team</CardDescription></div><Button variant="outline" size="sm" onClick={() => navigate('/policies')}>View all <ArrowRight data-icon="inline-end" /></Button></CardHeader><CardContent>{isLoading ? <div className="dashboard-policy-list" aria-label="Loading recent policies">{[0, 1, 2].map((item) => <div className="dashboard-policy-skeleton" key={item}><Skeleton className="loading-row-copy" /><Skeleton className="loading-row-badge" /></div>)}</div> : recent.length ? <div className="dashboard-policy-list">{recent.map((policy) => <button className="dashboard-policy-row" key={policy.id} onClick={() => navigate(`/policies/${policy.id}`)}><span className="dashboard-policy-main"><strong>{policy.name}</strong><span><UsersRound /> {policy.createdBy} <i /> {formatRelative(policy.updatedAt)}</span></span><div className="dashboard-policy-tags">{policy.labels.slice(0, 2).map((label) => <PolicyLabelBadge label={label} key={label} />)}</div><PolicyStatusBadge policy={policy} /><ArrowRight className="dashboard-row-arrow" /></button>)}</div> : <div className="dashboard-empty"><FileText /><strong>No policies yet</strong><span>Create a policy or ask the assistant for a draft.</span><Button variant="outline" onClick={() => setEditorOpen(true)}>Create your first policy</Button></div>}</CardContent></Card>
      <Card className="label-summary-card"><CardHeader className="dashboard-card-heading"><div><CardTitle>Labels</CardTitle><CardDescription>Organize policies your way</CardDescription></div></CardHeader><CardContent>{labelsLoading ? <div className="label-cloud label-cloud-loading">{[0, 1, 2, 3].map((item) => <Skeleton className="loading-label" key={item} />)}</div> : labels.length ? <div className="label-cloud">{labels.slice(0, 12).map((label) => <button className="label-cloud-item" key={label} onClick={() => navigate(`/policies?label=${encodeURIComponent(label)}`)}><PolicyLabelBadge label={label} /><span>{policies.filter((policy) => policy.labels.includes(label)).length}</span></button>)}</div> : <p className="labels-empty">Create reusable labels, then assign them to policies.</p>}<Button className="subtle-action" variant="ghost" onClick={() => navigate('/labels')}>Manage labels <ArrowRight data-icon="inline-end" /></Button></CardContent></Card>
    </section>
    <PolicySchedule isLoading={isLoading} />
    <section className="dashboard-charts">
      <Card className="dashboard-chart-card trend-card"><CardHeader className="dashboard-card-heading"><div><CardTitle>Policy activity</CardTitle><CardDescription>Changes across your policy library</CardDescription></div><select aria-label="Policy activity date range" className="chart-range-select" value={activityRange} onChange={(event) => setActivityRange(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></CardHeader><CardContent><ChartContainer config={activityConfig} className="trend-chart"><AreaChart accessibilityLayer data={trend} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 4" /><XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} minTickGap={24} /><YAxis yAxisId="events" hide allowDecimals={false} /><YAxis yAxisId="total" hide orientation="right" allowDecimals={false} /><ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />{(['added', 'removed', 'draft', 'scheduled'] as const).map((type) => <Area key={type} yAxisId="events" dataKey={type} name={activityConfig[type].label} type="monotone" stackId="activity" stroke={`var(--color-${type})`} fill={`var(--color-${type})`} fillOpacity={0.15} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />)}<Line yAxisId="total" dataKey="total" name="Total policies" type="monotone" stroke="var(--color-total)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /></AreaChart></ChartContainer><div className="trend-summary activity-summary"><span className="activity-legend">{(['added', 'removed', 'draft', 'scheduled'] as const).map((type) => <span key={type}><i style={{ backgroundColor: activityConfig[type].color }} />{activityConfig[type].label} <strong>{activityTotals[type]}</strong></span>)}<span><i style={{ backgroundColor: activityConfig.total.color }} />Total <strong>{policies.length}</strong></span></span><span><Activity /> {activityTotals.added + activityTotals.removed + activityTotals.draft + activityTotals.scheduled} events</span></div></CardContent></Card>
      <Card className="dashboard-chart-card status-card"><CardHeader className="dashboard-card-heading"><div><CardTitle>Current status</CardTitle><CardDescription>How your library is set up today</CardDescription></div></CardHeader><CardContent><div className="status-chart-wrap"><ChartContainer config={statusConfig} className="status-chart"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={statusData} dataKey="count" nameKey="name" innerRadius={52} outerRadius={68} startAngle={90} endAngle={-270} strokeWidth={2}>{statusData.map((entry) => <Cell key={entry.name} fill={`var(--color-${entry.name})`} />)}</Pie></PieChart></ChartContainer><div className="status-chart-center"><strong>{isLoading ? '—' : policies.length}</strong><span>policies</span></div></div><div className="status-legend"><StatusLegend label="Active" count={activeCount} color="active" /><StatusLegend label="Scheduled" count={scheduledCount} color="scheduled" /><StatusLegend label="Inactive" count={inactiveCount} color="inactive" /><StatusLegend label="Draft" count={draftCount} color="draft" /></div><div className="status-note"><span>Active policies currently in effect</span><strong>{activeCount} <small>of {policies.length}</small></strong></div></CardContent></Card>
    </section>
    <PolicyEditorDialog open={editorOpen} onOpenChange={setEditorOpen} onSave={save} policy={null} />
  </>
}

function Metric({ icon, label, value, note, isLoading }: { icon: React.ReactNode; label: string; value: string | number; note: string; isLoading: boolean }) { return <Card className="dashboard-metric"><CardContent><span className="metric-symbol">{icon}</span><span className="metric-label">{label}</span><strong className="metric-value">{isLoading ? <Skeleton className="loading-metric-value" /> : value}</strong><span className="metric-note">{isLoading ? <Skeleton className="loading-metric-note" /> : note}</span></CardContent></Card> }
function StatusLegend({ label, count, color }: { label: string; count: number; color: string }) { return <div className="status-legend-row"><span className={`legend-dot legend-${color}`} /><span>{label}</span><strong>{count}</strong></div> }
function buildActivityTrend(policies: ReturnType<typeof usePolicies>['policies'], activity: ReturnType<typeof usePolicies>['activity'], rangeDays: number) {
  const now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - (rangeDays - 1)); start.setHours(0, 0, 0, 0)
  const effectiveActivity = [...activity]
  const hasEvent = (id: string, type: PolicyActivityType) => activity.some((event) => event.policyId === id && event.type === type)
  for (const policy of policies) {
    if (!hasEvent(policy.id, 'added')) effectiveActivity.push({ id: `legacy-added-${policy.id}`, policyId: policy.id, policyName: policy.name, type: 'added', occurredAt: policy.createdAt })
    if (policy.status === 'draft' && !hasEvent(policy.id, 'draft')) effectiveActivity.push({ id: `legacy-draft-${policy.id}`, policyId: policy.id, policyName: policy.name, type: 'draft', occurredAt: policy.updatedAt })
    if (getPolicyLifecycle(policy) === 'scheduled' && !hasEvent(policy.id, 'scheduled')) effectiveActivity.push({ id: `legacy-scheduled-${policy.id}`, policyId: policy.id, policyName: policy.name, type: 'scheduled', occurredAt: policy.updatedAt })
  }
  return Array.from({ length: rangeDays }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index)
    const key = dateKey(date)
    const daily = effectiveActivity.filter((event) => dateKey(new Date(event.occurredAt)) === key)
    const label = rangeDays <= 7 ? new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date) : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
    const laterEvents = effectiveActivity.filter((event) => dateKey(new Date(event.occurredAt)) > key)
    const total = Math.max(0, policies.length - laterEvents.filter((event) => event.type === 'added').length + laterEvents.filter((event) => event.type === 'removed').length)
    return { day: label, added: daily.filter((event) => event.type === 'added').length, removed: daily.filter((event) => event.type === 'removed').length, draft: daily.filter((event) => event.type === 'draft').length, scheduled: daily.filter((event) => event.type === 'scheduled').length, total }
  })
}
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function firstName(name?: string) { return name?.trim().split(/\s+/)[0] || 'there' }
function timeOfDay(date: Dayjs) { const hour = date.hour(); return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening' }
function formatRelative(value: string) { const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000); return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago` }
function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Please try again.' }
