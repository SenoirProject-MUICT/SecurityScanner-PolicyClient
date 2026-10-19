import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PolicyAssistant } from '@/components/policy-assistant'
import { usePolicies } from '@/stores/policy-store'
import type { Policy, PolicyDraftInput } from '@/libs/policies'

export function AssistantPage() {
  const { create } = usePolicies()
  const navigate = useNavigate()
  async function save(input: PolicyDraftInput): Promise<Policy> {
    const created = await create(input)
    toast.success('Draft saved to your policies', { description: created.name })
    navigate(`/policies/${created.id}`)
    return created
  }
  return <PolicyAssistant onSave={save} />
}
