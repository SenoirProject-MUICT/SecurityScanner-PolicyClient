import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, Check, ChevronDown, Copy, KeyRound, MailPlus, Shield, Trash2, UserRound, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeading } from '@/components/app-shell'
import { useAuth } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { usePolicyStore } from '@/stores/policy-store'
import { useLabelStore } from '@/stores/label-store'
import { createWorkspaceJoinCode, listWorkspaceJoinCodes, revokeWorkspaceJoinCode, type CreatedWorkspaceJoinCode, type WorkspaceJoinCode, type WorkspaceMember, type WorkspaceRole } from '@/libs/workspaces'

export function TeamPage() {
  const { user } = useAuth()
  const { workspaces, selectedWorkspaceId, members, canManage, isLoading, isMutating, error, selectWorkspace, invite, changeRole, changeStatus, remove } = useWorkspaceStore()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)
  const [joinCodeList, setJoinCodeList] = useState<{ workspaceId: string; codes: WorkspaceJoinCode[]; error: string }>({ workspaceId: '', codes: [], error: '' })
  const [now, setNow] = useState(0)
  const [joinCodeOpen, setJoinCodeOpen] = useState(false)
  const [joinCodeExpiresIn, setJoinCodeExpiresIn] = useState(7)
  const [createdJoinCode, setCreatedJoinCode] = useState<CreatedWorkspaceJoinCode | null>(null)
  const [joinCodeError, setJoinCodeError] = useState('')
  const [joinCodeBusy, setJoinCodeBusy] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<WorkspaceJoinCode | null>(null)

  useEffect(() => {
    let active = true
    if (!selectedWorkspaceId || !canManage) return
    void listWorkspaceJoinCodes(selectedWorkspaceId)
      .then((codes) => {
        if (active) {
          setJoinCodeList({ workspaceId: selectedWorkspaceId, codes, error: '' })
          setNow(Date.now())
        }
      })
      .catch((cause) => {
        if (active) setJoinCodeList({ workspaceId: selectedWorkspaceId, codes: [], error: message(cause) })
      })
    return () => { active = false }
  }, [selectedWorkspaceId, canManage])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteError('')
    try {
      await invite(email.trim(), inviteRole)
      toast.success('Invitation added', { description: 'The member is now listed in this workspace.' })
      setEmail('')
      setInviteRole('member')
      setInviteOpen(false)
    } catch (cause) { setInviteError(message(cause)) }
  }

  async function updateRole(member: WorkspaceMember, role: WorkspaceRole) {
    try { await changeRole(member.id, role); toast.success('Member role updated') }
    catch (cause) { toast.error('Could not update role', { description: message(cause) }) }
  }

  async function updateStatus(member: WorkspaceMember) {
    const nextStatus = member.status === 'disabled' ? 'active' : 'disabled'
    try { await changeStatus(member.id, nextStatus); toast.success(nextStatus === 'active' ? 'Member reactivated' : 'Member deactivated') }
    catch (cause) { toast.error('Could not update member', { description: message(cause) }) }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    try { await remove(removeTarget.id); toast.success('Member removed'); setRemoveTarget(null) }
    catch (cause) { toast.error('Could not remove member', { description: message(cause) }) }
  }

  async function switchWorkspace(workspaceId: string) {
    setJoinCodeError('')
    await selectWorkspace(workspaceId)
    await Promise.all([usePolicyStore.getState().refresh(), useLabelStore.getState().refresh()])
  }

  async function submitJoinCode() {
    if (!selectedWorkspaceId) return
    setJoinCodeBusy(true); setJoinCodeError('')
    try {
      const created = await createWorkspaceJoinCode(selectedWorkspaceId, joinCodeExpiresIn)
      setCreatedJoinCode(created)
      setJoinCodeList((current) => ({ workspaceId: selectedWorkspaceId, codes: [created, ...(current.workspaceId === selectedWorkspaceId ? current.codes : [])], error: '' }))
      setNow(Date.now())
    } catch (cause) { setJoinCodeError(message(cause)) }
    finally { setJoinCodeBusy(false) }
  }

  async function copyJoinCode() {
    if (!createdJoinCode) return
    try { await navigator.clipboard.writeText(createdJoinCode.code); toast.success('Join code copied') }
    catch { setJoinCodeError('Could not copy the code. Select and copy it manually.') }
  }

  async function revokeCode() {
    if (!revokeTarget || !selectedWorkspaceId) return
    setJoinCodeBusy(true)
    try {
      await revokeWorkspaceJoinCode(selectedWorkspaceId, revokeTarget.id)
      const revokedAt = new Date().toISOString()
      setJoinCodeList((current) => current.workspaceId === selectedWorkspaceId ? { ...current, codes: current.codes.map((code) => code.id === revokeTarget.id ? { ...code, revokedAt } : code) } : current)
      setNow(Date.now())
      setRevokeTarget(null); toast.success('Join code revoked')
    } catch (cause) { setJoinCodeError(message(cause)); setRevokeTarget(null) }
    finally { setJoinCodeBusy(false) }
  }

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
  const activeCount = members.filter((member) => member.status === 'active').length
  const pendingCount = members.filter((member) => member.status === 'invited').length
  const joinCodes = joinCodeList.workspaceId === selectedWorkspaceId ? joinCodeList.codes : []
  const joinCodesLoading = canManage && Boolean(selectedWorkspaceId) && joinCodeList.workspaceId !== selectedWorkspaceId
  const joinCodeListError = joinCodeList.workspaceId === selectedWorkspaceId ? joinCodeList.error : ''

  return <>
    <SectionHeading eyebrow="WORKSPACE ACCESS" title="Team members" description="Manage who can access this workspace and what they can do." action={canManage ? <div className="team-header-actions"><Button className="primary-action" onClick={() => setInviteOpen(true)}><MailPlus data-icon="inline-start" /> Invite member</Button></div> : undefined} />

    {error && <Alert variant="destructive" className="team-alert"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert>}

    <Card className="team-card">
      <CardHeader className="team-card-header">
        <div className="team-heading-copy"><CardTitle>Members</CardTitle><CardDescription>Workspace roles apply to everyone in this workspace. Reviewers are assigned separately to individual merge requests.</CardDescription></div>
        {workspaces.length > 1 && <label className="team-workspace-picker"><span>Workspace</span><span className="team-select-wrap"><select aria-label="Select workspace" value={selectedWorkspaceId} onChange={(event) => void switchWorkspace(event.target.value)}>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><ChevronDown aria-hidden="true" /></span></label>}
      </CardHeader>
      <CardContent className="team-card-content">
        <div className="team-summary" aria-live="polite">
          <span className="team-workspace-name"><span className="team-workspace-mark"><Shield /></span><span><small>Current workspace</small><strong>{selectedWorkspace?.name ?? (isLoading ? 'Loading workspace…' : 'Workspace')}</strong></span></span>
          <span className="team-summary-count"><strong>{activeCount}</strong> active{pendingCount > 0 && <><i /> <strong>{pendingCount}</strong> invited</>}</span>
        </div>

        {isLoading ? <div className="team-skeleton-list" aria-label="Loading team members">{[0, 1, 2].map((item) => <div className="team-skeleton-row" key={item}><Skeleton className="team-skeleton-avatar" /><div><Skeleton className="team-skeleton-name" /><Skeleton className="team-skeleton-email" /></div><Skeleton className="team-skeleton-action" /></div>)}</div> : members.length ? <div className="team-member-list" role="list" aria-label="Workspace members">
          {members.map((member) => {
            const isCurrentUser = member.userId === user?.id
            return <article className={`team-member-row ${member.status === 'disabled' ? 'is-disabled' : ''}`} key={member.id} role="listitem">
              <span className="team-member-avatar" aria-hidden="true">{initials(member.name || member.email)}</span>
              <div className="team-member-identity"><div className="team-member-name-line"><strong>{member.name || member.email.split('@')[0]}</strong>{isCurrentUser && <Badge variant="secondary" className="team-you-badge">You</Badge>}</div><span>{member.email || 'Email unavailable'}</span></div>
              <Badge variant="outline" className={`team-status status-${member.status}`}>{member.status === 'invited' ? <MailPlus /> : member.status === 'disabled' ? <UserRound /> : <Check />}{member.status === 'invited' ? 'Invitation pending' : member.status === 'disabled' ? 'Deactivated' : 'Active'}</Badge>
              {canManage ? <div className="team-member-actions">
                <label className="team-role-control"><span className="sr-only">Role for {member.email}</span><select aria-label={`Role for ${member.email}`} disabled={isMutating} value={member.role} onChange={(event) => void updateRole(member, event.target.value as WorkspaceRole)}><option value="admin">Admin</option><option value="member">Member</option></select><ChevronDown aria-hidden="true" /></label>
                {member.status !== 'invited' && <Button size="sm" variant="outline" disabled={isMutating} onClick={() => void updateStatus(member)}>{member.status === 'disabled' ? 'Reactivate' : 'Deactivate'}</Button>}
                <Button size="icon-sm" variant="ghost" className="team-remove-button" aria-label={`Remove ${member.email}`} title="Remove member" disabled={isMutating} onClick={() => setRemoveTarget(member)}><Trash2 /></Button>
              </div> : <Badge variant="secondary" className="team-role-readonly">{member.role === 'admin' ? 'Admin' : 'Member'}</Badge>}
            </article>
          })}
        </div> : <div className="team-empty"><UsersRound /><strong>No members found</strong><span>Invite a teammate to start sharing this workspace.</span>{canManage && <Button variant="outline" onClick={() => setInviteOpen(true)}>Invite a member</Button>}</div>}
      </CardContent>
    </Card>

    <Card className="team-roles-card"><CardContent><div className="team-role-note"><span className="team-role-note-icon"><Shield /></span><div><strong>Workspace roles</strong><p><b>Admins</b> can invite people and manage membership. <b>Members</b> can access the workspace. Review tasks will be assigned to members separately.</p></div></div></CardContent></Card>

    {canManage && <Card className="team-join-codes-card"><CardHeader className="team-card-header"><div className="team-heading-copy"><CardTitle>Workspace join codes</CardTitle><CardDescription>Share a time-limited code with people who should join this workspace.</CardDescription></div><Button className="team-create-code-button" variant="outline" onClick={() => { setCreatedJoinCode(null); setJoinCodeError(''); setJoinCodeOpen(true) }}><KeyRound data-icon="inline-start" /> Create join code</Button></CardHeader><CardContent className="team-card-content">{(joinCodeError || joinCodeListError) && <Alert variant="destructive"><AlertCircle /><AlertDescription>{joinCodeError || joinCodeListError}</AlertDescription></Alert>}{joinCodesLoading ? <div className="team-join-code-loading" role="status">Loading join codes…</div> : joinCodes.length ? <div className="team-join-code-list">{joinCodes.map((code) => { const expired = now > 0 && Date.parse(code.expiresAt) <= now; const inactive = Boolean(code.revokedAt) || expired; return <div className="team-join-code-row" key={code.id}><span><strong>{inactive ? (code.revokedAt ? 'Revoked' : 'Expired') : 'Active code'}</strong><small>{code.revokedAt ? `Revoked ${new Date(code.revokedAt).toLocaleDateString()}` : `Expires ${new Date(code.expiresAt).toLocaleString()}`}</small></span>{!inactive && <Button size="sm" variant="outline" disabled={joinCodeBusy} onClick={() => setRevokeTarget(code)}>Revoke</Button>}</div> })}</div> : <p className="team-join-code-empty">No join codes yet. Create one to let teammates join without an email invite.</p>}</CardContent></Card>}

    <Dialog open={inviteOpen} onOpenChange={(open) => { if (!isMutating) { setInviteOpen(open); if (open) setInviteError('') } }}><DialogContent className="team-invite-dialog"><DialogHeader><DialogTitle>Invite a member</DialogTitle><DialogDescription>Add someone to {selectedWorkspace?.name ?? 'this workspace'}. New users receive a sign-in invitation.</DialogDescription></DialogHeader><form onSubmit={(event) => void submitInvite(event)}>{inviteError && <Alert id="team-invite-error" variant="destructive"><AlertCircle /><AlertDescription>{inviteError}</AlertDescription></Alert>}<FieldGroup><Field><FieldLabel htmlFor="team-invite-email">Email address</FieldLabel><Input id="team-invite-email" type="email" autoComplete="email" required maxLength={254} placeholder="name@company.com" value={email} aria-describedby={inviteError ? 'team-invite-error' : undefined} onChange={(event) => { setEmail(event.target.value); if (inviteError) setInviteError('') }} /><FieldDescription>Existing accounts are added directly. New users receive an email invite.</FieldDescription></Field><Field><FieldLabel htmlFor="team-invite-role">Workspace role</FieldLabel><select id="team-invite-role" className="team-form-select" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}><option value="member">Member</option><option value="admin">Admin</option></select></Field></FieldGroup><DialogFooter><Button type="button" variant="outline" disabled={isMutating} onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit" className="primary-action" disabled={isMutating || !email.trim()}>{isMutating ? 'Sending invite…' : 'Send invitation'}</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={joinCodeOpen} onOpenChange={(open) => { if (!joinCodeBusy) { setJoinCodeOpen(open); if (!open) { setCreatedJoinCode(null); setJoinCodeError('') } } }}><DialogContent className="team-join-code-dialog"><DialogHeader><DialogTitle>{createdJoinCode ? 'Share this join code' : 'Create a join code'}</DialogTitle><DialogDescription>{createdJoinCode ? 'Anyone with this code can join this workspace until it expires. Copy it now; the code is shown only once.' : 'Choose how long the code should remain valid. You can revoke it at any time.'}</DialogDescription></DialogHeader>{joinCodeError && <Alert variant="destructive"><AlertCircle /><AlertDescription>{joinCodeError}</AlertDescription></Alert>}{createdJoinCode ? <div className="team-created-code"><code>{createdJoinCode.code}</code><Button type="button" variant="outline" onClick={() => void copyJoinCode()}><Copy data-icon="inline-start" /> Copy code</Button><small>Expires {new Date(createdJoinCode.expiresAt).toLocaleString()}</small></div> : <><label className="team-join-code-expiration">Code expires after<select className="team-form-select" value={joinCodeExpiresIn} onChange={(event) => setJoinCodeExpiresIn(Number(event.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label><DialogFooter><Button type="button" variant="outline" disabled={joinCodeBusy} onClick={() => setJoinCodeOpen(false)}>Cancel</Button><Button type="button" className="primary-action" disabled={joinCodeBusy} onClick={() => void submitJoinCode()}>{joinCodeBusy ? 'Creating…' : 'Create code'}</Button></DialogFooter></>}</DialogContent></Dialog>

    <AlertDialog open={Boolean(removeTarget)} onOpenChange={(open) => { if (!open && !isMutating) setRemoveTarget(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this member?</AlertDialogTitle><AlertDialogDescription>{removeTarget?.email} will lose access to {selectedWorkspace?.name ?? 'this workspace'}. You can invite them again later.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel><AlertDialogAction className="team-confirm-remove" disabled={isMutating} onClick={(event) => { event.preventDefault(); void confirmRemove() }}>{isMutating ? 'Removing…' : 'Remove member'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open && !joinCodeBusy) setRevokeTarget(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Revoke this join code?</AlertDialogTitle><AlertDialogDescription>Anyone who hasn’t used this code will no longer be able to join with it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={joinCodeBusy}>Cancel</AlertDialogCancel><AlertDialogAction className="team-confirm-remove" disabled={joinCodeBusy} onClick={(event) => { event.preventDefault(); void revokeCode() }}>{joinCodeBusy ? 'Revoking…' : 'Revoke code'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>
}

function initials(value: string) { return value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'M' }
function message(cause: unknown) { return cause instanceof Error ? cause.message : 'Please try again.' }
