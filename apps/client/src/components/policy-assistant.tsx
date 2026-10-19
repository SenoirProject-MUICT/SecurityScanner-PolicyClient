import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowUp, Check, ClipboardCheck, FileText, Plus, RotateCcw, Sparkles, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { SectionHeading } from '@/components/app-shell'
import { generateMockPolicy } from '@/libs/policy-assistant'
import { BRAND } from '@/constants/brand'
import type { Policy, PolicyDraftInput } from '@/libs/policies'

const promptSchema = z.object({ prompt: z.string().trim().min(12, 'Add a little more detail so the draft has useful context.').max(1200, 'Keep your description under 1,200 characters.') })
type PromptValues = z.infer<typeof promptSchema>
const suggestions = ['A process for reviewing security incidents', 'Guidelines for accessible UI changes', 'How to handle customer data safely']

export function PolicyAssistant({ onSave }: { onSave: (input: PolicyDraftInput) => Promise<Policy> }) {
  const [lastPrompt, setLastPrompt] = useState('')
  const [draft, setDraft] = useState<PolicyDraftInput | null>(null)
  const [saved, setSaved] = useState(false)
  const form = useForm<PromptValues>({ resolver: zodResolver(promptSchema), defaultValues: { prompt: '' }, mode: 'onSubmit' })

  function generate(values: PromptValues) {
    setLastPrompt(values.prompt.trim())
    setDraft(generateMockPolicy(values.prompt))
    setSaved(false)
  }

  async function addPolicy() {
    if (!draft) return
    await onSave(draft)
    setSaved(true)
    setDraft(null)
    setLastPrompt('')
    form.reset()
  }

  return <>
    <SectionHeading eyebrow="POLICY ASSISTANT" title="A first draft, from a few words." description="Describe the policy you need. Review the structure, then add it to your library." />
    <div className="assistant-workspace">
      <section className="chat-column">
        <div className="chat-toolbar"><span className="assistant-avatar"><Sparkles size={16} /></span><div><strong>Policy assistant</strong><span><i /> Ready to help</span></div><Badge className="preview-badge">Local preview</Badge></div>
        <div className="chat-history" aria-live="polite">
          <div className="assistant-message"><span className="assistant-message-avatar"><WandSparkles size={14} /></span><div><p>Tell me what your team needs a policy for. I’ll shape it into a title and summary you can review.</p><small>{BRAND.name} · Draft assistant</small></div></div>
          {lastPrompt && <div className="user-message"><p>{lastPrompt}</p></div>}
          {draft && <div className="assistant-message generated-message"><span className="assistant-message-avatar"><Sparkles size={14} /></span><div className="generated-content"><div className="generated-intro"><strong>Here’s a starting point.</strong><span>Review and edit it before adding.</span></div>
            <Card className="generated-card"><CardContent><div className="generated-label"><FileText size={14} /> POLICY DRAFT <span className="draft-status">Editable</span></div><label className="draft-field-label">Policy name<input value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label className="draft-field-label">Summary<textarea rows={4} maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <div className="draft-actions"><Button className="primary-action" disabled={!draft.name.trim() || !draft.description.trim()} onClick={() => void addPolicy()}><Plus size={15} /> Add to policies</Button><Button variant="ghost" onClick={() => { setDraft(null); setLastPrompt(''); setSaved(false); form.reset() }}><RotateCcw size={14} /> Start over</Button></div>
            </CardContent></Card><small className="assistant-disclaimer">Local preview uses a simple template. Connect an AI provider to generate policy guidance from a model.</small></div></div>}
          {saved && <div className="assistant-message saved-message"><span className="assistant-message-avatar"><Check size={14} /></span><p>Added to your policy library. You can find and update it in Policies.</p></div>}
        </div>
        <form className="chat-composer" onSubmit={form.handleSubmit(generate)} noValidate><Textarea {...form.register('prompt')} rows={3} placeholder="Describe the policy you need…" aria-label="Describe the policy you need" /><div className="composer-footer"><span>{form.formState.errors.prompt?.message || 'Be specific about who it applies to and what it should cover.'}</span><Button type="submit" aria-label="Generate policy draft" disabled={form.formState.isSubmitting}><ArrowUp size={16} /></Button></div></form>
        <p className="chat-disclaimer">Review generated drafts before using them. This local preview does not provide legal advice.</p>
      </section>
      <aside className="assistant-rail"><Card className="assistant-help-card"><CardContent><p className="section-eyebrow">MAKE A BETTER DRAFT</p><h2>Give it some context</h2><p className="rail-description">A useful prompt mentions the people, the situation, and the outcome you want.</p><div className="prompt-check"><span><Check size={12} /></span>Who needs to follow it?</div><div className="prompt-check"><span><Check size={12} /></span>What should it help prevent?</div><div className="prompt-check"><span><Check size={12} /></span>What does good look like?</div></CardContent></Card>
        <Card className="suggestion-card"><CardContent><p className="section-eyebrow">TRY A STARTER</p>{suggestions.map((text) => <button className="suggestion-button" key={text} onClick={() => { form.setValue('prompt', text, { shouldValidate: false }); document.querySelector<HTMLTextAreaElement>('.chat-composer textarea')?.focus() }}>{text}<ArrowUp size={13} /></button>)}</CardContent></Card>
        <div className="preview-note"><ClipboardCheck size={15} /><span><strong>Draft first, decide later.</strong> Nothing is added until you choose.</span></div>
      </aside>
    </div>
  </>
}
