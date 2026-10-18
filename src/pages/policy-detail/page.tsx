import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { PolicyDetail } from '@/components/policy-detail'
import { PolicyEditorDialog } from '@/components/policy-editor-dialog'
import { usePolicies } from '@/stores/policy-store'
import type { Policy, PolicyDraftInput, PolicyStatus } from '@/libs/policies'

export function PolicyDetailPage() {
  const { policyId } = useParams()
  const navigate = useNavigate()
  const { policies, isLoading, error, update, remove, setStatus } = usePolicies()
  const [editorOpen, setEditorOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const policy = policies.find((candidate) => candidate.id === policyId)

  async function save(input: PolicyDraftInput): Promise<Policy> {
    if (!policy) throw new Error('Policy not found')
    try { const saved = await update(policy.id, input); setEditorOpen(false); toast.success('Policy updated', { description: saved.name }); return saved }
    catch (cause) { toast.error('Could not update policy', { description: getMessage(cause) }); throw cause }
  }

  async function toggle(status: PolicyStatus) {
    if (!policy) return
    try { const updated = await setStatus(policy.id, status); toast.success(status === 'active' ? 'Policy turned on' : 'Policy turned off', { description: updated.name }) }
    catch (cause) { toast.error('Could not update policy status', { description: getMessage(cause) }) }
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

  return <><PolicyDetail policy={policy} policies={policies} onBack={() => navigate('/policies')} onOpenPolicy={(item) => navigate(`/policies/${item.id}`)} onEdit={() => setEditorOpen(true)} onDelete={() => setConfirmDelete(true)} onToggle={(status) => void toggle(status)} /><PolicyEditorDialog open={editorOpen} policy={policy} onOpenChange={setEditorOpen} onSave={save} />
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogTitle>Remove this policy?</AlertDialogTitle><AlertDialogDescription>“{policy.name}” will be removed from your library. This can’t be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep policy</AlertDialogCancel><AlertDialogAction className="confirm-delete" onClick={() => void deleteCurrent()}>Remove policy</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Please try again.' }
