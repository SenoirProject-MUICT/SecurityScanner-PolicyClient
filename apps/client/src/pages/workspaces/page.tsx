import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronDown, KeyRound, LogOut, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { WorkspaceCard } from '@/components/workspace-card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/stores/auth-store'
import { useAuthMutations } from '@/libs/auth/hooks'
import type { WorkspaceOption } from '@/libs/workspaces'
import { ThemeToggle } from '@/components/theme-toggle'
import { BrandLogo } from '@/components/brand-logo'
import { BRAND } from '@/constants/brand'

type WorkspaceDialogMode = 'join' | null

type Props = {
  workspaces: WorkspaceOption[]
  enterWorkspace: (workspaceId: string) => void
  createWorkspace: (name: string) => Promise<unknown>
  joinWorkspace: (code: string) => Promise<unknown>
  isMutating: boolean
}

export function WorkspacesPage({ workspaces, enterWorkspace, createWorkspace, joinWorkspace, isMutating }: Props) {
  const reduceMotion = useReducedMotion()
  const profileMenuRef = useRef<HTMLDetailsElement>(null)
  const { user } = useAuth()
  const { signOut, isPending: isSigningOut } = useAuthMutations()
  const [dialogMode, setDialogMode] = useState<WorkspaceDialogMode>(null)
  const [formValue, setFormValue] = useState('')
  const [formError, setFormError] = useState('')
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    function closeMenu(event: PointerEvent) { if (!profileMenuRef.current?.contains(event.target as Node)) profileMenuRef.current?.removeAttribute('open') }
    function closeOnEscape(event: globalThis.KeyboardEvent) { if (event.key === 'Escape') profileMenuRef.current?.removeAttribute('open') }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeMenu); document.removeEventListener('keydown', closeOnEscape) }
  }, [])

  async function submitWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      await joinWorkspace(formValue.trim())
      setDialogMode(null)
      setFormValue('')
      toast.success('Workspace joined')
    } catch (cause) { setFormError(message(cause)) }
  }

  async function submitCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')
    try {
      await createWorkspace(workspaceName.trim())
      setIsCreatingWorkspace(false)
      setWorkspaceName('')
      toast.success('Workspace created')
    } catch (cause) { setCreateError(message(cause)) }
  }

  async function handleSignOut() {
    profileMenuRef.current?.removeAttribute('open')
    try { await signOut() }
    catch (cause) { toast.error('Could not sign out', { description: message(cause) }) }
  }

  return <main className={`workspace-manager-page${isCreatingWorkspace ? ' workspace-create-mode' : ''}`}>
    {!isCreatingWorkspace && <header className="workspace-manager-topbar">
      <a className="wordmark" href="/" aria-label={`${BRAND.name} home`}><BrandLogo /></a>
      <div className="workspace-manager-account"><details ref={profileMenuRef} className="profile-menu workspace-profile-menu">
        <summary className="profile-trigger" aria-label="Open profile menu"><span className="user-avatar">{getInitials(user?.name ?? 'User')}</span><span className="profile-trigger-copy"><strong>{user?.name ?? 'Account'}</strong><small>{user?.email ?? ''}</small></span><ChevronDown className="profile-chevron" /></summary>
        <div className="profile-popover"><div className="profile-menu-heading"><span className="user-avatar">{getInitials(user?.name ?? 'User')}</span><span><strong>{user?.name ?? 'Account'}</strong><small>{user?.email ?? ''}</small></span></div><div className="profile-menu-divider" /><ThemeToggle /><div className="profile-menu-divider" /><button type="button" className="profile-menu-item profile-signout" disabled={isSigningOut} onClick={() => void handleSignOut()}><LogOut />{isSigningOut ? 'Signing out…' : 'Sign out'}</button></div>
      </details></div>
    </header>}

    <AnimatePresence mode="wait" initial={false}>
    {isCreatingWorkspace ? <motion.section key="create-workspace" className="workspace-create-content" initial={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(-6px)' }} transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.23, 1, 0.32, 1] }}>
      <button className="workspace-create-back" type="button" onClick={() => { setIsCreatingWorkspace(false); setCreateError('') }}><ArrowLeft aria-hidden="true" /> Back to workspaces</button>
      <p className="section-eyebrow">A NEW TEAM SPACE</p>
      <h1>Create your workspace</h1>
      <p className="workspace-create-lede">Give your team a shared home for policies, labels, and the work that keeps everything secure.</p>
      <form className="workspace-create-form" onSubmit={(event) => void submitCreateWorkspace(event)}>
        <label htmlFor="workspace-create-name">Workspace name</label>
        <Input id="workspace-create-name" autoFocus required maxLength={100} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder={`${user?.name || 'My'}’s workspace`} />
        {createError && <Alert variant="destructive"><AlertDescription>{createError}</AlertDescription></Alert>}
        <Button className="primary-action" type="submit" disabled={isMutating || !workspaceName.trim()}>{isMutating ? 'Creating workspace…' : 'Create workspace'}<ArrowRight data-icon="inline-end" /></Button>
      </form>
      <p className="workspace-create-account">Signed in as {user?.email}</p>
    </motion.section> : <motion.section key="workspace-picker" className="workspace-manager-content" initial={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: reduceMotion ? 'translateY(0px)' : 'translateY(-6px)' }} transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.23, 1, 0.32, 1] }}>
      <div className="workspace-manager-heading">
        <div><p className="section-eyebrow">YOUR TEAM SPACES</p><h1>Choose a workspace</h1><p>Select a workspace to continue to your team’s policies and tools.</p></div>
        <div className="workspace-manager-heading-actions">
          <Button type="button" variant="outline" className="workspace-join-button" onClick={() => { setFormValue(''); setFormError(''); setDialogMode('join') }}><KeyRound data-icon="inline-start" /> Join with code</Button>
          <Button type="button" className="primary-action" onClick={() => { setWorkspaceName(''); setCreateError(''); setIsCreatingWorkspace(true) }}><Plus data-icon="inline-start" /> Create workspace</Button>
        </div>
      </div>

      <div className="workspace-manager-list">
        {workspaces.map((workspace, index) => <WorkspaceCard key={workspace.id} workspace={workspace} variant={index % 3} onSelect={enterWorkspace} />)}
      </div>
    </motion.section>}
    </AnimatePresence>

    <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!isMutating && !open) { setDialogMode(null); setFormError('') } }}>
      <DialogContent className="workspace-manager-dialog"><DialogHeader><DialogTitle>Join a workspace</DialogTitle><DialogDescription>Enter a time-limited code shared by a workspace admin.</DialogDescription></DialogHeader>
        <form onSubmit={(event) => void submitWorkspace(event)}><FieldGroup>
          <Field><FieldLabel htmlFor="workspace-join-code">Join code</FieldLabel><Input id="workspace-join-code" autoFocus required maxLength={40} autoCapitalize="characters" autoComplete="off" value={formValue} onChange={(event) => setFormValue(event.target.value.toUpperCase())} placeholder="PD-AB12-CD34-EF56-7890-AB12-CD34" /></Field>
        </FieldGroup>{formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}<DialogFooter><Button type="button" variant="outline" disabled={isMutating} onClick={() => setDialogMode(null)}>Cancel</Button><Button type="submit" className="primary-action" disabled={isMutating || !formValue.trim()}>{isMutating ? 'Joining…' : 'Join workspace'}</Button></DialogFooter></form>
      </DialogContent>
    </Dialog>

  </main>
}

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Try again.' }
function getInitials(value: string) { return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') }
