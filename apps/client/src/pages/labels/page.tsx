import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowRight, Tag, Trash2 } from 'lucide-react'
import { ContextMenu } from '@base-ui/react/context-menu'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SectionHeading } from '@/components/app-shell'
import { useLabels } from '@/stores/label-store'
import { usePolicies } from '@/stores/policy-store'
import { PolicyLabelBadge } from '@/components/policy-label-badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const schema = z.object({ name: z.string().trim().min(2, 'Use at least 2 characters.').max(32, 'Keep the label under 32 characters.') })
type Values = z.infer<typeof schema>

export function LabelsPage() {
  const { labels, labelRecords, create, update, remove } = useLabels()
  const { policies } = usePolicies()
  const navigate = useNavigate()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '' }, mode: 'onBlur' })
  const editForm = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '' }, mode: 'onBlur' })
  const [selected, setSelected] = useState<(typeof labelRecords)[number] | null>(null)
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | null>(null)
  useEffect(() => { editForm.reset({ name: selected?.name ?? '' }) }, [selected, editForm])
  const details = useMemo(() => labels.map((name) => ({ name, count: policies.filter((policy) => policy.labels.includes(name)).length, record: labelRecords.find((label) => label.name === name) })), [labels, labelRecords, policies])

  async function ensureRecord(name: string, record: (typeof labelRecords)[number] | undefined) {
    if (record) return record
    const created = await create(name)
    return created
  }

  async function openEdit(name: string, record: (typeof labelRecords)[number] | undefined) {
    try {
      const managed = await ensureRecord(name, record)
      setSelected(managed)
      setDialogMode('edit')
    } catch (cause) {
      toast.error('Could not open label', { description: cause instanceof Error ? cause.message : 'Please try again.' })
    }
  }

  async function openDelete(name: string, record: (typeof labelRecords)[number] | undefined) {
    try {
      const managed = await ensureRecord(name, record)
      setSelected(managed)
      setDialogMode('delete')
    } catch (cause) {
      toast.error('Could not open label actions', { description: cause instanceof Error ? cause.message : 'Please try again.' })
    }
  }

  async function submit(values: Values) {
    try {
      await create(values.name.trim())
      form.reset({ name: '' })
      toast.success('Label created', { description: values.name.trim() })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Please try again.'
      form.setError('name', { message })
    }
  }

  async function submitEdit(values: Values) {
    if (!selected) return
    try {
      await update(selected.id, values.name.trim())
      setDialogMode(null)
      toast.success('Label updated', { description: values.name.trim() })
    } catch (cause) {
      editForm.setError('name', { message: cause instanceof Error ? cause.message : 'Please try again.' })
    }
  }

  async function submitDelete() {
    if (!selected) return
    try {
      await remove(selected.id)
      setDialogMode(null)
      toast.success('Label removed', { description: selected.name })
      setSelected(null)
    } catch (cause) {
      toast.error('Could not remove label', { description: cause instanceof Error ? cause.message : 'Please try again.' })
    }
  }

  return <>
    <SectionHeading eyebrow="WORKSPACE ORGANIZATION" title="Labels" description="Create reusable labels here, then choose them when creating or editing a policy." action={<Button variant="outline" onClick={() => navigate('/policies')}>Browse policies <ArrowRight data-icon="inline-end" /></Button>} />
    <div className="labels-page-grid">
      <Card className="settings-card labels-create-card"><CardHeader className="settings-card-heading"><CardTitle>Create a label</CardTitle><CardDescription>Labels help your team group and find related policies.</CardDescription></CardHeader><CardContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate><FieldGroup><Field data-invalid={Boolean(form.formState.errors.name)}><FieldLabel htmlFor="label-name">Label name</FieldLabel><Input id="label-name" autoComplete="off" placeholder="e.g. Security" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />{form.formState.errors.name ? <FieldError errors={[form.formState.errors.name]} /> : <FieldDescription>Use a short name your team will recognize.</FieldDescription>}</Field></FieldGroup><Button type="submit" className="primary-action label-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creating…' : 'Create label'}</Button></form>
      </CardContent></Card>
      <Card className="settings-card labels-list-card"><CardHeader className="settings-card-heading"><CardTitle>Your labels <span className="label-total">{labels.length}</span></CardTitle><CardDescription>Click a policy count to browse matching policies. Click a label to edit, or right-click for actions.</CardDescription></CardHeader><CardContent>{details.length ? <div className="managed-label-grid">{details.map(({ name, count, record }) => <ContextMenu.Root key={record?.id ?? name}><ContextMenu.Trigger className="managed-label-context-trigger"><Card className="managed-label-card" tabIndex={0} role="group" title={record ? `Created by ${record.createdBy}. Used by ${count} ${count === 1 ? 'policy' : 'policies'}. Click to edit; right-click for actions.` : `Used by ${count} ${count === 1 ? 'policy' : 'policies'}. Click to manage this label.`} onClick={() => void openEdit(name, record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openEdit(name, record) } }}><CardContent><button type="button" className="managed-label-edit" aria-label={`Edit ${name}`} onClick={(event) => { event.stopPropagation(); void openEdit(name, record) }}><PolicyLabelBadge label={name} className="managed-label-name" /></button><small>{record ? `Created by ${record.createdBy}` : 'Used by existing policies'}</small><Button variant="outline" size="sm" disabled={count === 0} onClick={(event) => { event.stopPropagation(); navigate(`/policies?label=${encodeURIComponent(name)}`) }}>{count} {count === 1 ? 'policy' : 'policies'} <ArrowRight data-icon="inline-end" /></Button></CardContent></Card></ContextMenu.Trigger><ContextMenu.Portal><ContextMenu.Positioner className="label-context-positioner"><ContextMenu.Popup className="label-context-popup"><ContextMenu.Item className="label-context-item" onClick={() => void openEdit(name, record)}>Edit label</ContextMenu.Item><ContextMenu.Separator className="label-context-separator" /><ContextMenu.Item className="label-context-item destructive" onClick={() => void openDelete(name, record)}><Trash2 />Remove label</ContextMenu.Item></ContextMenu.Popup></ContextMenu.Positioner></ContextMenu.Portal></ContextMenu.Root>)}</div> : <div className="labels-manager-empty"><Tag /><strong>No labels yet</strong><span>Create your first label to make policies easier to organize.</span></div>}</CardContent></Card>
    </div>
    <Dialog open={dialogMode === 'edit'} onOpenChange={(open) => { if (!open) setDialogMode(null) }}><DialogContent className="label-edit-dialog sm:max-w-md"><DialogHeader><DialogTitle>Edit label</DialogTitle><DialogDescription>Rename this label. Policies that use it will be updated too.</DialogDescription></DialogHeader><form onSubmit={editForm.handleSubmit(submitEdit)} noValidate><FieldGroup><Field data-invalid={Boolean(editForm.formState.errors.name)}><FieldLabel htmlFor="edit-label-name">Label name</FieldLabel><Input id="edit-label-name" autoComplete="off" aria-invalid={Boolean(editForm.formState.errors.name)} {...editForm.register('name')} />{editForm.formState.errors.name && <FieldError errors={[editForm.formState.errors.name]} />}</Field></FieldGroup><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button><Button type="submit" className="primary-action" disabled={editForm.formState.isSubmitting}>{editForm.formState.isSubmitting ? 'Saving…' : 'Save changes'}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={dialogMode === 'delete'} onOpenChange={(open) => { if (!open) setDialogMode(null) }}><DialogContent><DialogHeader><DialogTitle>Remove “{selected?.name}”?</DialogTitle><DialogDescription>This removes the label from your library and from every policy that currently uses it.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button><Button type="button" variant="destructive" onClick={() => void submitDelete()}>Remove label</Button></DialogFooter></DialogContent></Dialog>
  </>
}
