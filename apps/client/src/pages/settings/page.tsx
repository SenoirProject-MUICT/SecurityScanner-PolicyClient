import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SectionHeading } from '@/components/app-shell'
import { useAuth } from '@/stores/auth-store'
import { useAuthMutations } from '@/libs/auth/hooks'
import { apiBaseUrl } from '@/libs/api/client'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import { BRAND } from '@/constants/brand'

const profileSchema = z.object({ name: z.string().trim().min(2, 'Enter a name with at least 2 characters.').max(60, 'Keep your name under 60 characters.') })
type ProfileValues = z.infer<typeof profileSchema>

export function SettingsPage() {
  const { user } = useAuth()
  const { updateProfile } = useAuthMutations()
  const isProd = useRuntimeModeStore((state) => state.isProd)
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '' } })

  useEffect(() => { if (user) form.reset({ name: user.name }) }, [form, user])

  async function save(values: ProfileValues) {
    try {
      await updateProfile(values.name)
      toast.success('Profile updated')
    } catch (cause) {
      toast.error('Could not update profile', { description: cause instanceof Error ? cause.message : 'Please try again.' })
    }
  }

  return <>
    <SectionHeading eyebrow="YOUR WORKSPACE" title="Settings" description="Manage your profile and see how this workspace connects to policy data." />
    <div className="settings-grid">
      <Card className="settings-card">
        <CardHeader className="settings-card-heading"><CardTitle>Profile</CardTitle><CardDescription>Update the name shown beside policies you create.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(save)}>
            <FieldGroup className="settings-fields">
              <Field><FieldLabel htmlFor="profile-email">Email address</FieldLabel><Input id="profile-email" value={user?.email ?? ''} readOnly disabled /><FieldDescription>Your sign-in email is managed by your authentication provider.</FieldDescription></Field>
              <Field data-invalid={form.formState.errors.name ? true : undefined}><FieldLabel htmlFor="profile-name">Display name</FieldLabel><Input id="profile-name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />{form.formState.errors.name && <FieldError errors={[form.formState.errors.name]} />}</Field>
            </FieldGroup>
            <div className="settings-actions"><span>Signed in with {isProd ? `${BRAND.name} API` : 'mock authentication'}</span><Button type="submit" className="primary-action" disabled={form.formState.isSubmitting || !form.formState.isDirty}>{form.formState.isSubmitting ? 'Saving…' : 'Save profile'}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card className="settings-card connection-settings">
        <CardHeader className="settings-card-heading"><CardTitle>Data connection</CardTitle><CardDescription>Policy data and login are handled by the {BRAND.name} API.</CardDescription></CardHeader>
        <CardContent>
          <div className="settings-connection-status"><span className={`status-dot ${isProd ? 'is-connected' : ''}`} /><div><strong>{isProd ? `${BRAND.name} API mode` : 'Local mock mode'}</strong><span>{isProd ? 'Your browser sends requests to the backend. Supabase credentials stay on the server.' : 'Your policies and account stay in this browser for this demo.'}</span></div></div>
          <div className="settings-key-list"><ConnectionRow label="API endpoint" configured={isProd} value={isProd ? apiBaseUrl : undefined} /></div>
          <p className="settings-hint">Configure <code>VITE_API_BASE_URL</code> in <code>apps/client/.env</code> and Supabase server keys in <code>apps/backend/.env</code>.</p>
        </CardContent>
      </Card>
    </div>
  </>
}

function ConnectionRow({ label, configured, value }: { label: string; configured: boolean; value?: string }) {
  return <div className="settings-key-row"><span>{label}</span><span className={`settings-key-state ${configured ? 'is-ready' : ''}`}><i />{value ?? (configured ? 'Added' : 'Not added')}</span></div>
}
