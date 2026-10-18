import { useState, type FormEvent } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, Building2, KeyRound } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

type SetupMode = 'create' | 'join'

export function WorkspaceSetupPage({ loadError = '' }: { loadError?: string }) {
  const { user } = useAuth()
  const { createWorkspace, joinWorkspace, initialize, isMutating } = useWorkspaceStore()
  const [mode, setMode] = useState<SetupMode | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [submitError, setSubmitError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    try {
      if (mode === 'create') await createWorkspace(workspaceName.trim())
      else if (mode === 'join') await joinWorkspace(joinCode.trim())
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not update workspace access. Try again.')
    }
  }

  return <main className="workspace-setup-page">
    <a className="wordmark" href="/">policy<span>desk</span></a>
    <section className="workspace-setup-content">
      <span className="workspace-setup-mark"><Building2 aria-hidden="true" /></span>
      <p className="section-eyebrow">YOUR TEAM SPACE</p>
      <h1>Where should we take you?</h1>
      <p className="workspace-setup-lede">Create a workspace for your team, or join one with a code from its admin.</p>

      {loadError ? <Card className="workspace-setup-error"><CardContent><Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert><Button variant="outline" disabled={isMutating} onClick={() => void initialize()}>Try again</Button></CardContent></Card> : mode ? <Card className="workspace-setup-form-card"><CardContent>
        <button className="workspace-setup-back" type="button" onClick={() => { setMode(null); setSubmitError('') }}><ArrowLeft aria-hidden="true" /> Back to options</button>
        <h2>{mode === 'create' ? 'Create a workspace' : 'Join a workspace'}</h2>
        <p>{mode === 'create' ? 'You’ll be its admin and can invite your team.' : 'Enter the time-limited code shared by a workspace admin.'}</p>
        {submitError && <Alert variant="destructive" className="workspace-setup-alert"><AlertCircle aria-hidden="true" /><AlertDescription>{submitError}</AlertDescription></Alert>}
        <form onSubmit={(event) => void submit(event)}>
          {mode === 'create' ? <label className="workspace-setup-field">Workspace name<Input autoFocus required maxLength={100} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder={`${user?.name || 'My'}’s workspace`} /></label> : <label className="workspace-setup-field">Join code<Input autoFocus required maxLength={40} autoCapitalize="characters" autoComplete="off" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="PD-AB12-CD34-EF56-7890-AB12-CD34" /></label>}
          <Button className="primary-action workspace-setup-submit" type="submit" disabled={isMutating || (mode === 'create' ? !workspaceName.trim() : !joinCode.trim())}>{isMutating ? 'Setting up…' : mode === 'create' ? 'Create workspace' : 'Join workspace'}<ArrowRight aria-hidden="true" /></Button>
        </form>
      </CardContent></Card> : <div className="workspace-setup-options">
        <button type="button" className="workspace-setup-option" onClick={() => setMode('create')}><span className="workspace-setup-option-icon"><Building2 aria-hidden="true" /></span><span><strong>Create a workspace</strong><small>Start a new shared space and become its admin.</small></span><ArrowRight className="workspace-setup-option-arrow" aria-hidden="true" /></button>
        <button type="button" className="workspace-setup-option" onClick={() => setMode('join')}><span className="workspace-setup-option-icon"><KeyRound aria-hidden="true" /></span><span><strong>Join with a code</strong><small>Use a code shared by an existing workspace admin.</small></span><ArrowRight className="workspace-setup-option-arrow" aria-hidden="true" /></button>
      </div>}
      <p className="workspace-setup-account">Signed in as {user?.email}</p>
    </section>
  </main>
}
