import { useState } from 'react'
import { useParams } from 'react-router'
import { useWorkspaceNavigate } from '@/libs/workspaces/navigation'
import { toast } from 'sonner'
import { LoaderCircle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { PolicyApprovalCard } from '@/components/policy-approval-card'
import { PolicyDetail } from '@/components/policy-detail'
import { PolicyEditorDialog } from '@/components/policy-editor-dialog'
import { usePolicies, usePolicyHistory } from '@/libs/policies/hooks'
import { useWorkspaceMembers, useWorkspaces } from '@/libs/workspaces/hooks'
import { useAuth } from '@/stores/auth-store'
import type { Policy, PolicyDraftInput, PolicyToggleStatus } from '@/libs/policies'

type Decision = 'submit' | 'approve' | 'reject'
const decisionCopy: Record<Decision, { title: string; description: string; label: string; placeholder: string; confirm: string }> = {
  submit: { title: 'Submit for approval', description: 'A workspace admin reviews the policy before AI checks use it.', label: 'Note for the reviewer', placeholder: 'What changed, or what should the reviewer check?', confirm: 'Submit' },
  approve: { title: 'Approve this policy', description: 'Approved policies apply to AI checks within their effective dates.', label: 'Approval note', placeholder: 'Anything the author should know?', confirm: 'Approve' },
  reject: { title: 'Reject this policy', description: 'The author sees your reason and can update the policy and resubmit it.', label: 'Reason', placeholder: 'Explain what needs to change before you can approve it.', confirm: 'Reject' },
}

export function PolicyDetailPage() {
  const { policyId } = useParams()
  const navigate = useWorkspaceNavigate()
  const { user } = useAuth()
  const { workspaces, selectedWorkspaceId } = useWorkspaces()
  const { members } = useWorkspaceMembers()
  const { policies, isLoading, error, update, remove, setStatus, isStatusUpdating, statusUpdatingPolicyId, submit, approve, reject, isWorkflowUpdating } = usePolicies()
  const history = usePolicyHistory(policyId)
  const [editorOpen, setEditorOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const policy = policies.find((candidate) => candidate.id === policyId)
  const isAdmin = workspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.role === 'admin'
  const access = { isAdmin, currentUserId: user?.id ?? '', activeAdminCount: members.filter((member) => member.role === 'admin' && member.status === 'active').length }

  async function save(input: PolicyDraftInput): Promise<Policy> {
    if (!policy) throw new Error('Policy not found')
    try {
      const saved = await update(policy.id, input)
      setEditorOpen(false)
      toast.success(saved.status === 'pending' && (policy.status !== 'pending' || saved.version !== policy.version) ? 'Policy submitted for approval' : 'Policy updated', { description: saved.name })
      return saved
    } catch (cause) { toast.error('Could not update policy', { description: getMessage(cause) }); throw cause }
  }

  async function toggle(status: PolicyToggleStatus) {
    if (!policy) return
    try { const updated = await setStatus(policy.id, status); toast.success(status === 'active' ? 'Policy turned on' : 'Policy turned off', { description: updated.name }) }
    catch (cause) { toast.error('Could not update policy status', { description: getMessage(cause) }) }
  }

  function openDecision(next: Decision) { setDecision(next); setNote(''); setNoteError('') }

  async function confirmDecision() {
    if (!policy || !decision) return
    if (decision === 'reject' && !note.trim()) { setNoteError('Explain why so the author can fix it.'); return }
    try {
      const updated = decision === 'submit' ? await submit(policy.id, note) : decision === 'approve' ? await approve(policy.id, note) : await reject(policy.id, note)
      toast.success(decision === 'submit' ? 'Policy submitted for approval' : decision === 'approve' ? 'Policy approved' : 'Policy rejected', { description: updated.name })
      setDecision(null)
    } catch (cause) { toast.error(decision === 'submit' ? 'Could not submit policy' : 'Could not save your decision', { description: getMessage(cause) }) }
  }

  async function deleteCurrent() {
    if (!policy) return
    try { await remove(policy.id); toast.success('Policy removed', { description: policy.name }); navigate('/policies') }
    catch (cause) { toast.error('Could not remove policy', { description: getMessage(cause) }) }
    finally { setConfirmDelete(false) }
  }

  if (isLoading) return <div className="page-loading" role="status">Loading policy details…</div>
  if (error) return <section className="page-empty"><h1>Could not load this policy</h1><p>{error}</p><Button variant="outline" onClick={() => navigate('/policies')}>Back to policies</Button></section>
  if (!policy) return <section className="page-empty"><h1>Policy not found</h1><p>It may have been removed or you may not have access to it.</p><Button variant="outline" onClick={() => navigate('/policies')}>Back to policies</Button></section>

  const copy = decision ? decisionCopy[decision] : null
  const approval = <PolicyApprovalCard policy={policy} events={history.events} isLoading={history.isLoading} error={history.error} access={access} isBusy={isWorkflowUpdating} onSubmit={() => openDecision('submit')} onApprove={() => openDecision('approve')} onReject={() => openDecision('reject')} onEdit={() => setEditorOpen(true)} />
  return <><PolicyDetail policy={policy} policies={policies} approval={approval} canToggle={isAdmin} isStatusUpdating={isStatusUpdating && statusUpdatingPolicyId === policy.id} onBack={() => navigate('/policies')} onOpenPolicy={(item) => navigate(`/policies/${item.id}`)} onEdit={() => setEditorOpen(true)} onDelete={() => setConfirmDelete(true)} onToggle={(status) => void toggle(status)} /><PolicyEditorDialog open={editorOpen} policy={policy} onOpenChange={setEditorOpen} onSave={save} />
    <Dialog open={decision !== null} onOpenChange={(open) => { if (!open) setDecision(null) }}><DialogContent className="approval-dialog">{copy && <form onSubmit={(event) => { event.preventDefault(); void confirmDecision() }} noValidate>
      <DialogHeader><DialogTitle>{copy.title}</DialogTitle><DialogDescription>“{policy.name}” · {copy.description}</DialogDescription></DialogHeader>
      <Field data-invalid={Boolean(noteError)} className="approval-note-field"><FieldLabel htmlFor="approval-note">{copy.label} {decision !== 'reject' && <span className="optional-label">Optional</span>}</FieldLabel><Textarea id="approval-note" value={note} onChange={(event) => { setNote(event.target.value); if (noteError) setNoteError('') }} aria-invalid={Boolean(noteError)} placeholder={copy.placeholder} rows={4} maxLength={1000} autoFocus />{noteError ? <FieldError>{noteError}</FieldError> : <FieldDescription>Saved in the policy’s activity history.</FieldDescription>}</Field>
      <DialogFooter className="approval-dialog-footer"><Button type="button" variant="outline" onClick={() => setDecision(null)}>Cancel</Button><Button type="submit" disabled={isWorkflowUpdating} className={decision === 'reject' ? 'confirm-delete' : 'dialog-submit'}>{isWorkflowUpdating ? <><LoaderCircle className="spin-icon" size={15} /> Saving…</> : copy.confirm}</Button></DialogFooter>
    </form>}</DialogContent></Dialog>
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogTitle>Remove this policy?</AlertDialogTitle><AlertDialogDescription>“{policy.name}” will be removed from your library. This can’t be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep policy</AlertDialogCancel><AlertDialogAction className="confirm-delete" onClick={() => void deleteCurrent()}>Remove policy</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Please try again.' }
