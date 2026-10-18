import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ArrowRight, Check, Fingerprint, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/stores/auth-store'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'

const schema = z.object({ name: z.string().optional(), email: z.email('Enter a valid email address.'), password: z.string().min(8, 'Use at least 8 characters.') })
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const isProd = useRuntimeModeStore((state) => state.isProd)
  const navigate = useNavigate()
  const location = useLocation()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } })
  if (user) return <Navigate to="/" replace />
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'

  async function submit(values: Values) {
    setError(''); setMessage('')
    try {
      if (isCreating) {
        const created = await signUp(values.email, values.password, values.name ?? '')
        if (created) navigate(redirectTo, { replace: true })
        else setMessage('Your account is ready. Check your email to confirm it, then sign in.')
      } else {
        await signIn(values.email, values.password)
        navigate(redirectTo, { replace: true })
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.') }
  }

  async function continueAsDemo() {
    setError(''); setMessage('')
    try { await signIn('alex@policydesk.demo', 'demo-password'); navigate('/', { replace: true }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the demo workspace.') }
  }

  return <main className="login-page"><section className="login-story"><a className="wordmark" href="/">policy<span>desk</span></a><div className="login-story-content"><p className="login-signature">PolicyDesk <span>·</span> policy intelligence</p><h1>Clear policies.<br /><span className="login-rolling-words" aria-label="Confident decisions"><span aria-hidden="true">{['Confident decisions.', 'Better decisions.', 'Clearer teamwork.'].map((phrase, index) => <span key={phrase} style={{ '--roll-delay': `${-index * 3}s` } as React.CSSProperties}>{phrase}</span>)}</span></span></h1><p>One calm place to write, manage, and understand the policies that guide your team.</p><div className="login-points"><span><Check size={14} /> Know what your policies cover</span><span><Check size={14} /> Keep ownership and dates clear</span><span><Check size={14} /> Draft a starting point in seconds</span></div></div><span className="login-story-footer">A little more clarity, every day.</span></section>
    <section className="login-form-side"><div className="login-form-wrap"><span className="login-mobile-wordmark">policy<span>desk</span></span><div className="login-welcome"><span className="section-eyebrow">YOUR POLICY WORKSPACE</span><h2>{isCreating ? 'Create your account' : 'Welcome back'}</h2><p>{isCreating ? 'Set up an account to keep your team’s policies together.' : 'Sign in to continue to your policy workspace.'}</p></div>
      {error && <div role="alert" className="login-alert">{error}</div>}{message && <div role="status" className="login-success">{message}</div>}
      <form className="login-form" onSubmit={form.handleSubmit(submit)} noValidate>
        {isCreating && <label className="login-field">Your name<Input {...form.register('name')} autoComplete="name" placeholder="e.g. Alex Morgan" /></label>}
        <label className="login-field">Email address<Input {...form.register('email')} type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(form.formState.errors.email)} />{form.formState.errors.email && <small>{form.formState.errors.email.message}</small>}</label>
        <label className="login-field">Password<Input {...form.register('password')} type="password" autoComplete={isCreating ? 'new-password' : 'current-password'} placeholder="At least 8 characters" aria-invalid={Boolean(form.formState.errors.password)} />{form.formState.errors.password && <small>{form.formState.errors.password.message}</small>}</label>
        {!isCreating && <button type="button" className="forgot-link" onClick={() => setMessage('Password reset is available after Supabase email settings are configured.')}>Forgot password?</button>}
        <Button type="submit" className="login-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'One moment…' : isCreating ? 'Create account' : 'Sign in'}<ArrowRight size={15} /></Button>
      </form>
      <div className="login-switch">{isCreating ? 'Already have an account?' : 'New to Policy Desk?'} <button type="button" onClick={() => { setIsCreating((value) => !value); setError(''); setMessage('') }}>{isCreating ? 'Sign in' : 'Create an account'}</button></div>
      {!isProd && <><div className="login-divider"><span>OR</span></div><Button variant="outline" className="demo-button" onClick={() => void continueAsDemo()}><Fingerprint size={15} /> Continue as demo user</Button><p className="demo-hint"><LockKeyhole size={12} /> Mock sign-in stays on this device. Any valid email works.</p></>}
      {isProd && <p className="demo-hint"><LockKeyhole size={12} /> Secured by your Supabase Auth project.</p>}
    </div><span className="login-legal">By continuing, you agree to use generated policy drafts as a starting point for review.</span></section>
  </main>
}
