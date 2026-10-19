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
import { supabaseSettings } from '@/libs/supabase'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'

const profileSchema = z.object({ name: z.string().trim().min(2, 'Enter a name with at least 2 characters.').max(60, 'Keep your name under 60 characters.') })
type ProfileValues = z.infer<typeof profileSchema>

export function SettingsPage() {
  const { user, updateProfile } = useAuth()
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
            <div className="settings-actions"><span>Signed in with {isProd ? 'Supabase Auth' : 'mock authentication'}</span><Button type="submit" className="primary-action" disabled={form.formState.isSubmitting || !form.formState.isDirty}>{form.formState.isSubmitting ? 'Saving…' : 'Save profile'}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card className="settings-card connection-settings">
        <CardHeader className="settings-card-heading"><CardTitle>Data connection</CardTitle><CardDescription>Policy data and login use the same configured connection mode.</CardDescription></CardHeader>
        <CardContent>
          <div className="settings-connection-status"><span className={`status-dot ${isProd ? 'is-connected' : ''}`} /><div><strong>{isProd ? 'Supabase connected' : 'Local mock mode'}</strong><span>{isProd ? 'Your policies and account are stored in Supabase.' : 'Your policies and account stay in this browser for this demo.'}</span></div></div>
          <div className="settings-key-list"><ConnectionRow label="Project URL" configured={supabaseSettings.urlConfigured} /><ConnectionRow label="Publishable key" configured={supabaseSettings.keyConfigured} /></div>
          <p className="settings-hint">Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to your local environment file, then restart the app to use Supabase.</p>
        </CardContent>
      </Card>
    </div>
  </>
}

function ConnectionRow({ label, configured }: { label: string; configured: boolean }) {
  return <div className="settings-key-row"><span>{label}</span><span className={`settings-key-state ${configured ? 'is-ready' : ''}`}><i />{configured ? 'Added' : 'Not added'}</span></div>
}
