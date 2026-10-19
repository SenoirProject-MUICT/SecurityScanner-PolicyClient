import { ArrowLeft, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeading } from '@/components/app-shell'
import { Switch } from '@/components/ui/switch'
import { PolicyStatusBadge } from '@/components/policy-status-badge'
import type { Policy, PolicyStatus } from '@/libs/policies'
import { PolicyLabelBadge } from '@/components/policy-label-badge'

export function PolicyDetail({ policy, policies, onBack, onOpenPolicy, onEdit, onDelete, onToggle }: { policy: Policy; policies: Policy[]; onBack: () => void; onOpenPolicy: (policy: Policy) => void; onEdit: () => void; onDelete: () => void; onToggle: (status: PolicyStatus) => void }) {
  const related = policies.filter((candidate) => candidate.id !== policy.id && candidate.labels.some((label) => policy.labels.some((tag) => tag.toLocaleLowerCase() === label.toLocaleLowerCase()))).slice(0, 4)
  return <>
    <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to policies</button>
    <SectionHeading eyebrow="POLICY DETAILS" title={policy.name} action={<div className="detail-actions"><Button variant="outline" onClick={onEdit}><Pencil data-icon="inline-start" /> Edit</Button><Button className="delete-action" variant="outline" onClick={onDelete}><Trash2 data-icon="inline-start" /> Remove</Button></div>} />
    <div className="detail-layout">
      <section className="detail-main">
        <Card className="detail-card policy-content-card"><CardContent>
          <div className="policy-status-strip"><div className="policy-status-copy"><p className="section-eyebrow">POLICY STATUS</p><PolicyStatusBadge policy={policy} /><p className="policy-effective-hint">{getEffectiveHint(policy)}</p></div><label className="status-switch-label"><span>{policy.status === 'active' ? 'Turn off' : 'Turn on'}</span><Switch checked={policy.status === 'active'} onCheckedChange={(checked) => onToggle(checked ? 'active' : 'inactive')} aria-label={policy.status === 'active' ? 'Turn policy off' : 'Turn policy on'} /></label></div>
          <div className="policy-overview-block"><p className="section-eyebrow">OVERVIEW</p><p className="detail-summary">{policy.description || 'No summary has been written for this policy. Add one to help teammates understand when it applies.'}</p></div>
        </CardContent></Card>
      </section>
      <aside className="detail-aside"><Card className="detail-card policy-sidebar-card"><CardContent><section className="sidebar-facts"><p className="section-eyebrow">POLICY DETAILS</p><div className="fact-row"><span>Policy ID</span><code>{policy.id.slice(0, 12)}</code></div><div className="fact-row"><span>Applies</span><strong>{policy.effectiveFrom || policy.effectiveUntil ? 'Date range' : 'Permanent'}</strong></div><div className="fact-row"><span>Effective</span><strong>{formatRange(policy.effectiveFrom, policy.effectiveUntil)}</strong></div><div className="fact-row"><span>Owner</span><strong>{policy.createdBy}</strong></div><div className="fact-row"><span>Created</span><strong>{formatDate(policy.createdAt)}</strong></div><div className="fact-row"><span>Updated</span><strong>{formatDate(policy.updatedAt)}</strong></div></section><section className="sidebar-labels"><p className="section-eyebrow">LABELS</p>{policy.labels.length ? <div className="detail-labels">{policy.labels.map((label) => <PolicyLabelBadge label={label} key={label} />)}</div> : <p className="muted-copy">No labels assigned.</p>}</section><section className="sidebar-related"><p className="section-eyebrow">RELATED POLICIES</p><h2>Shared labels</h2>{related.length ? related.map((item) => <button className="related-policy" key={item.id} onClick={() => onOpenPolicy(item)}><span className="related-mark"><ShieldCheck size={14} /></span><span><strong>{item.name}</strong><small>{item.labels.filter((label) => policy.labels.some((tag) => tag.toLocaleLowerCase() === label.toLocaleLowerCase())).slice(0, 2).join(', ')}</small></span></button>) : <p className="muted-copy">Policies with shared labels will appear here.</p>}</section></CardContent></Card></aside>
    </div>
  </>
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date) }
function formatRange(from: string | null, until: string | null) { if (!from && !until) return 'No end date'; return `${from ? formatDate(from) : 'Any time'} – ${until ? formatDate(until) : 'No end date'}` }
function getEffectiveHint(policy: Policy) { if (policy.status === 'draft') return 'Draft policies are not included in skill checks.'; if (policy.status === 'inactive') return 'This policy is switched off.'; const today = new Date().toISOString().slice(0, 10); if (policy.effectiveFrom && policy.effectiveFrom > today) return `Starts ${formatDate(policy.effectiveFrom)}.`; if (policy.effectiveUntil && policy.effectiveUntil < today) return `Ended ${formatDate(policy.effectiveUntil)}.`; return policy.effectiveFrom || policy.effectiveUntil ? `Applies ${formatRange(policy.effectiveFrom, policy.effectiveUntil)}.` : 'Applies permanently until switched off.' }
