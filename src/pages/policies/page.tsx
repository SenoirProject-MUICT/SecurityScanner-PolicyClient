import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PoliciesSection } from '@/components/policies-section'
import { PolicyEditorDialog } from '@/components/policy-editor-dialog'
import { usePolicies } from '@/stores/policy-store'
import type { Policy, PolicyDraftInput } from '@/libs/policies'

export function PoliciesPage() {
  const { policies, isLoading, error, create } = usePolicies()
  const navigate = useNavigate()
  const [editorOpen, setEditorOpen] = useState(false)

  async function save(input: PolicyDraftInput): Promise<Policy> {
    try {
      const created = await create(input)
      setEditorOpen(false)
      toast.success('Policy created', { description: created.name })
      navigate(`/policies/${created.id}`)
      return created
    } catch (cause) { toast.error('Could not create policy', { description: getMessage(cause) }); throw cause }
  }

  return <><PoliciesSection policies={policies} isLoading={isLoading} loadError={error} onOpenPolicy={(policy) => navigate(`/policies/${policy.id}`)} onCreate={() => setEditorOpen(true)} /><PolicyEditorDialog open={editorOpen} policy={null} onOpenChange={setEditorOpen} onSave={save} /></>
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Please try again.' }
