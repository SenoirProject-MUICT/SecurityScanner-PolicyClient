import { useEffect, useState } from 'react'
import { useWorkspaceNavigate } from '@/libs/workspaces/navigation'
import { Command } from 'cmdk'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, CornerDownLeft, FileText, LoaderCircle, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Policy, PolicyDraftInput } from '@/libs/policies'
import { useLabels } from '@/libs/labels/hooks'
import { PolicyLabelBadge } from '@/components/policy-label-badge'

const schema = z.object({
  name: z.string().trim().min(3, 'Use at least 3 characters for the policy name.').max(80, 'Keep the policy name under 80 characters.'),
  description: z.string().trim().max(500, 'Keep the summary under 500 characters.'),
  labels: z.array(z.string()),
  status: z.enum(['draft', 'active', 'inactive']),
  duration: z.enum(['permanent', 'range']),
  effectiveFrom: z.string(),
  effectiveUntil: z.string(),
}).superRefine((values, context) => {
  if (values.duration === 'range' && !values.effectiveFrom) context.addIssue({ code: 'custom', path: ['effectiveFrom'], message: 'Choose when this policy starts.' })
  if (values.duration === 'range' && !values.effectiveUntil) context.addIssue({ code: 'custom', path: ['effectiveUntil'], message: 'Choose when this policy ends.' })
  if (values.duration === 'range' && values.effectiveFrom && values.effectiveUntil && values.effectiveUntil < values.effectiveFrom) context.addIssue({ code: 'custom', path: ['effectiveUntil'], message: 'The end date must be after the start date.' })
})
type Values = z.infer<typeof schema>
const emptyValues: Values = { name: '', description: '', labels: [], status: 'active', duration: 'permanent', effectiveFrom: '', effectiveUntil: '' }

export function PolicyEditorDialog({ open, policy, onOpenChange, onSave }: { open: boolean; policy: Policy | null; knownLabels?: string[]; onOpenChange: (open: boolean) => void; onSave: (input: PolicyDraftInput) => Promise<Policy> }) {
  const { labels } = useLabels()
  const navigate = useWorkspaceNavigate()
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [labelSearch, setLabelSearch] = useState('')
  const [activeLabelOption, setActiveLabelOption] = useState('')
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyValues, mode: 'onBlur' })
  const currentLabels = useWatch({ control: form.control, name: 'labels' })
  const duration = useWatch({ control: form.control, name: 'duration' })

  useEffect(() => {
    if (!open) return
    form.reset(policy ? {
      name: policy.name, description: policy.description, labels: policy.labels,
      status: policy.status, duration: policy.effectiveFrom || policy.effectiveUntil ? 'range' : 'permanent',
      effectiveFrom: policy.effectiveFrom ?? '', effectiveUntil: policy.effectiveUntil ?? '',
    } : emptyValues)
  }, [open, policy, form])

  async function submit(values: Values) {
    await onSave({
      name: values.name.trim(), description: values.description.trim(), labels: values.labels,
      status: values.status, effectiveFrom: values.duration === 'range' ? values.effectiveFrom : null,
      effectiveUntil: values.duration === 'range' ? values.effectiveUntil : null,
    })
  }

  function toggleLabel(label: string) {
    const selected = currentLabels.includes(label)
    form.setValue('labels', selected ? currentLabels.filter((item) => item !== label) : [...currentLabels, label], { shouldDirty: true, shouldValidate: true })
  }

  const dateRange = duration === 'range'
  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="policy-dialog"><DialogHeader className="policy-dialog-header"><span className="dialog-icon"><FileText size={18} /></span><div><DialogTitle>{policy ? 'Update policy' : 'Create a policy'}</DialogTitle><DialogDescription>Define the policy, who it applies to, and when it should be active.</DialogDescription></div></DialogHeader>
    <form onSubmit={form.handleSubmit(submit)} noValidate><FieldGroup className="policy-fields">
      <Controller control={form.control} name="name" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Policy name</FieldLabel><Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder="e.g. Secure code review" autoComplete="off" />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>} />
      <Controller control={form.control} name="description" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Summary <span className="optional-label">Optional</span></FieldLabel><Textarea {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder="What should someone know about this policy?" rows={3} /><FieldDescription>Keep it short and easy to scan.</FieldDescription>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>} />
      <Field><FieldLabel>Labels <span className="optional-label">Optional</span></FieldLabel><div className="label-select-row"><button type="button" className="label-select-trigger" aria-haspopup="dialog" aria-expanded={labelDialogOpen} onClick={() => { setLabelSearch(''); setLabelDialogOpen(true) }}><span className="label-select-value">{currentLabels.length ? currentLabels.map((label) => <PolicyLabelBadge label={label} className="label-select-chip" key={label} />) : <span className="label-none">None yet</span>}</span><ChevronDown aria-hidden="true" /></button><Button type="button" variant="outline" size="icon" className="label-settings-button" aria-label="Manage labels" title="Manage labels" onClick={() => navigate('/labels')}><Settings2 /></Button></div>
        <FieldDescription>Choose from labels already in your workspace.</FieldDescription>
      </Field>
      <Field><FieldLabel>Policy status</FieldLabel><FieldDescription>Draft, active, or switched off.</FieldDescription><Controller control={form.control} name="status" render={({ field }) => <ToggleGroup className="status-toggle-group" variant="outline" value={[field.value]} onValueChange={(values) => { if (values[0]) field.onChange(values[0]) }} aria-label="Policy status"><ToggleGroupItem value="active">Active</ToggleGroupItem><ToggleGroupItem value="inactive">Inactive</ToggleGroupItem><ToggleGroupItem value="draft">Draft</ToggleGroupItem></ToggleGroup>} /></Field>
      <Field><FieldLabel>Applies</FieldLabel><Controller control={form.control} name="duration" render={({ field }) => <ToggleGroup className="duration-toggle-group" variant="outline" value={[field.value]} onValueChange={(values) => { if (values[0]) field.onChange(values[0]) }} aria-label="Policy duration"><ToggleGroupItem value="permanent">Permanent</ToggleGroupItem><ToggleGroupItem value="range">Date range</ToggleGroupItem></ToggleGroup>} /><FieldDescription>{dateRange ? 'The policy applies only within these dates.' : 'Stays in effect until switched off.'}</FieldDescription>
        {dateRange && <div className="date-range-fields"><Controller control={form.control} name="effectiveFrom" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="effective-from">Starts on</FieldLabel><Input {...field} id="effective-from" type="date" aria-invalid={fieldState.invalid} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>} /><Controller control={form.control} name="effectiveUntil" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor="effective-until">Ends on</FieldLabel><Input {...field} id="effective-until" type="date" aria-invalid={fieldState.invalid} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>} /></div>}
      </Field>
    </FieldGroup><DialogFooter className="policy-dialog-footer"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting} className="dialog-submit">{form.formState.isSubmitting ? <><LoaderCircle className="spin-icon" size={15} /> Saving…</> : <>{policy ? 'Save changes' : 'Create policy'}<ChevronRight size={15} /></>}</Button></DialogFooter></form>
  </DialogContent></Dialog>
  <Dialog open={labelDialogOpen} onOpenChange={(nextOpen) => { setLabelDialogOpen(nextOpen); if (!nextOpen) { setLabelSearch(''); setActiveLabelOption('') } }}><DialogContent className="label-picker-dialog"><DialogHeader><DialogTitle>Choose labels</DialogTitle><DialogDescription>Select one or more existing labels for this policy.</DialogDescription></DialogHeader><Command className="label-command" label="Choose policy labels" shouldFilter value={activeLabelOption} onValueChange={setActiveLabelOption}><label className="label-picker-search"><Search aria-hidden="true" /><Command.Input autoFocus value={labelSearch} onValueChange={setLabelSearch} placeholder="Search labels…" aria-label="Search labels" /></label><Command.List className="label-picker-options"><Command.Empty className="label-picker-no-results">{labels.length ? 'No labels match your search.' : 'No labels yet. Use the settings button to create one.'}</Command.Empty><Command.Group>{labels.map((label) => { const selected = currentLabels.includes(label); return <Command.Item value={label} key={label} aria-pressed={selected} onSelect={() => toggleLabel(label)} className="label-picker-option"><span className={`label-picker-check ${selected ? 'is-selected' : ''}`}>{selected && <Check aria-hidden="true" />}</span><span>{label}</span></Command.Item> })}</Command.Group></Command.List><div className="label-picker-keyboard"><span><kbd><ArrowUp /></kbd><kbd><ArrowDown /></kbd> navigate</span><span><kbd><CornerDownLeft /></kbd> toggle</span><kbd>ESC</kbd></div></Command><DialogFooter className="label-picker-footer"><span>{currentLabels.length} selected</span><Button type="button" onClick={() => setLabelDialogOpen(false)}>Done</Button></DialogFooter></DialogContent></Dialog></>
}

