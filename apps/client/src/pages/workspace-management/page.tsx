import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowLeft, Bell, Building2, GitBranch, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SectionHeading } from '@/components/app-shell'
import { WorkspaceCard } from '@/components/workspace-card'
import { useWorkspaces } from '@/libs/workspaces/hooks'
import { withWorkspaceId } from '@/libs/workspaces/navigation'

type SettingsSection = 'general' | 'members' | 'integrations' | 'notifications' | 'danger'

export function WorkspaceManagementPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { workspaces, selectedWorkspaceId, updateWorkspace, deleteWorkspace, isMutating } = useWorkspaces()
  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId)
  const isAdmin = workspace?.role === 'admin'
  const [nameState, setNameState] = useState(() => ({ workspaceId: workspace?.id, value: workspace?.name ?? '' }))
  if (nameState.workspaceId !== workspace?.id) setNameState({ workspaceId: workspace?.id, value: workspace?.name ?? '' })
  const name = nameState.value
  const [nameError, setNameError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteNameConfirmation, setDeleteNameConfirmation] = useState('')
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const hasUnsavedName = Boolean(isAdmin && workspace && name.trim() !== workspace.name)
  const blocker = useBlocker(hasUnsavedName)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset()
      toast.warning('Save or discard your workspace name change before leaving.')
    }
  }, [blocker])

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameError('')
    const cleanedName = name.trim()
    if (!workspace || !cleanedName) {
      setNameError('Enter a workspace name.')
      return
    }
    try {
      await updateWorkspace(workspace.id, cleanedName)
      setNameState({ workspaceId: workspace.id, value: cleanedName })
      toast.success('Workspace settings saved')
    } catch (cause) {
      setNameError(cause instanceof Error ? cause.message : 'Could not update the workspace. Try again.')
    }
  }

  async function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!workspace || deleteNameConfirmation !== workspace.name) return
    setDeleteError('')
    try {
      await deleteWorkspace(workspace.id)
      setDeleteOpen(false)
      toast.success('Workspace deleted', { description: `${workspace.name} and its data were removed.` })
      navigate('/', { replace: true })
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the workspace. Try again.')
    }
  }

  if (!workspace) return <>
    <SectionHeading eyebrow="WORKSPACE SETTINGS" title="Workspace unavailable" description="Choose an active workspace to manage its settings." />
    <Button variant="outline" onClick={() => navigate('/', { replace: true })}><ArrowLeft data-icon="inline-start" />Choose workspace</Button>
  </>

  const settingsSections: { id: SettingsSection; label: string; icon: typeof Building2 }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'members', label: 'Members', icon: UsersRound },
    { id: 'integrations', label: 'Integrations', icon: GitBranch },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return <>
  <div className="workspace-management-page">
    <SectionHeading eyebrow={workspace.name} title="Workspace settings" description="Manage this workspace’s details, access, and preferences." />
    <div className="workspace-settings-layout">
      <aside className="workspace-settings-nav" aria-label="Workspace settings sections">
        <p>WORKSPACE</p>
        {settingsSections.map(({ id, label, icon: Icon }) => <button key={id} type="button" disabled={hasUnsavedName && activeSection !== id} className={`workspace-settings-nav-item${activeSection === id ? ' is-active' : ''}`} aria-current={activeSection === id ? 'page' : undefined} onClick={() => setActiveSection(id)}><Icon aria-hidden="true" /><span>{label}</span>{(id === 'integrations' || id === 'notifications') && <small>Soon</small>}</button>)}
        {isAdmin && <><div className="workspace-settings-nav-divider" /><p>ADMINISTRATION</p><button type="button" disabled={hasUnsavedName && activeSection !== 'danger'} className={`workspace-settings-nav-item workspace-settings-danger-link${activeSection === 'danger' ? ' is-active' : ''}`} aria-current={activeSection === 'danger' ? 'page' : undefined} onClick={() => setActiveSection('danger')}><AlertTriangle aria-hidden="true" /><span>Danger zone</span></button></>}
      </aside>

      <div className="workspace-management-stack">
        {activeSection === 'general' && <Card id="general" className="workspace-management-card">
        <CardHeader>
          <div className="workspace-management-card-title"><div><CardTitle>General</CardTitle><CardDescription>Workspace details shared with your team.</CardDescription></div></div>
        </CardHeader>
        <CardContent>
          <form id="workspace-name-form" className="workspace-management-form workspace-management-general-form" onSubmit={(event) => void saveWorkspace(event)}>
            <div className="workspace-management-general-fields">
            <FieldGroup>
              <Field data-invalid={nameError ? true : undefined}>
                <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
                <Input id="workspace-name" value={name} maxLength={100} required disabled={!isAdmin} aria-invalid={Boolean(nameError)} onChange={(event) => { setNameState({ workspaceId: workspace.id, value: event.target.value }); setNameError('') }} />
                <FieldDescription>{isAdmin ? 'Choose a name your team will recognize.' : 'Only workspace admins can change this name.'}</FieldDescription>
                {isAdmin && nameError && <Alert variant="destructive"><AlertDescription>{nameError}</AlertDescription></Alert>}
              </Field>
            </FieldGroup>
            </div>
            <WorkspaceCard workspace={{ ...workspace, name: name.trim() || workspace.name }} className="workspace-settings-preview-card" />
          </form>
        </CardContent>
      </Card>}

      {activeSection === 'members' && <Card className="workspace-management-card">
        <CardHeader><div className="workspace-management-card-title"><span className="workspace-management-icon"><UsersRound aria-hidden="true" /></span><div><CardTitle>Members</CardTitle><CardDescription>Manage who can access this workspace.</CardDescription></div></div></CardHeader>
        <CardContent><div className="workspace-management-member-note">Review member access, roles, and invitations from your team page.</div><div className="workspace-management-actions"><Button className="primary-action" onClick={() => navigate(withWorkspaceId('/team', workspace.id))}>Manage members</Button></div></CardContent>
      </Card>}

      {(activeSection === 'integrations' || activeSection === 'notifications') && <Card className="workspace-management-card">
        <CardHeader><div className="workspace-management-card-title"><span className="workspace-management-icon">{activeSection === 'integrations' ? <GitBranch aria-hidden="true" /> : <Bell aria-hidden="true" />}</span><div><CardTitle>{activeSection === 'integrations' ? 'Integrations' : 'Notifications'}</CardTitle><CardDescription>{activeSection === 'integrations' ? 'Connect the tools your team uses.' : 'Choose how your workspace keeps you informed.'}</CardDescription></div></div></CardHeader>
        <CardContent><div className="workspace-management-member-note">This setting is planned for a future update.</div></CardContent>
      </Card>}

      {isAdmin && activeSection === 'danger' && <Card id="danger-zone" className="workspace-management-danger-card">
        <CardHeader>
          <div className="workspace-danger-heading"><div><CardTitle>Danger zone</CardTitle><CardDescription>Irreversible actions that affect everyone in this workspace.</CardDescription></div></div>
        </CardHeader>
        <CardContent className="workspace-danger-content">
          <div><strong>Delete this workspace</strong><p>Permanently delete {workspace.name}, its policies, labels, join codes, and member access.</p></div>
          <Button type="button" variant="outline" className="workspace-danger-button" onClick={() => { setDeleteError(''); setDeleteNameConfirmation(''); setDeleteOpen(true) }}>Delete workspace</Button>
        </CardContent>
      </Card>}
      </div>
    </div>

    <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!isMutating) { setDeleteOpen(open); if (!open) { setDeleteError(''); setDeleteNameConfirmation('') } } }}>
      <AlertDialogContent className="workspace-delete-dialog">
        <AlertDialogHeader><AlertDialogTitle>Delete workspace</AlertDialogTitle><AlertDialogDescription>This permanently deletes <strong>{workspace.name}</strong> and all of its policies, labels, join codes, and member access. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="confirm-workspace-name">Type the workspace name to confirm</FieldLabel>
          <Input id="confirm-workspace-name" autoComplete="off" value={deleteNameConfirmation} onChange={(event) => setDeleteNameConfirmation(event.target.value)} placeholder={workspace.name} />
        </Field>
        {deleteError && <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>}
        <AlertDialogFooter><AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel><AlertDialogAction className="workspace-danger-confirm" disabled={isMutating || deleteNameConfirmation !== workspace.name} onClick={(event) => void confirmDelete(event)}>{isMutating ? 'Deleting…' : 'Delete workspace'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  {typeof document !== 'undefined' && createPortal(<AnimatePresence initial={false}>
    {hasUnsavedName && <motion.div key="workspace-unsaved-bar" className="workspace-unsaved-bar" role="status" initial={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(8px)' }} transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.23, 1, 0.32, 1] }}>
      <div><strong>Unsaved changes</strong><span>Your workspace name hasn’t been updated yet.</span></div>
      <div className="workspace-unsaved-actions"><Button type="button" variant="ghost" disabled={isMutating} onClick={() => { setNameState({ workspaceId: workspace.id, value: workspace.name }); setNameError('') }}>Discard</Button><Button type="submit" form="workspace-name-form" className="primary-action" disabled={isMutating || !name.trim()}>{isMutating ? 'Saving…' : 'Save changes'}</Button></div>
    </motion.div>}
  </AnimatePresence>, document.body)}
  </>
}
