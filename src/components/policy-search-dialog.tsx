import { useEffect, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Command } from 'cmdk'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, ArrowUp, ArrowDown, CornerDownLeft, FileText } from 'lucide-react'
import { useNavigate } from 'react-router'
import { usePolicies } from '@/stores/policy-store'
import { PolicyStatusBadge } from '@/components/policy-status-badge'

export function PolicySearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { policies } = usePolicies()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(open)
  const [query, setQuery] = useState('')
  const [activePolicyId, setActivePolicyId] = useState('')
  const shouldReduceMotion = useReducedMotion()
  const duration = shouldReduceMotion ? 0.12 : 0.24
  const transition = { duration, ease: [0.23, 1, 0.32, 1] as const }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!policies.some((policy) => policy.id === activePolicyId)) setActivePolicyId(policies[0]?.id ?? '')
  }, [activePolicyId, policies])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDialogOpen(true)
  }, [open])

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setDialogOpen(true)
    onOpenChange(nextOpen)
    if (!nextOpen) setQuery('')
  }

  function openPolicy(id: string) {
    handleOpenChange(false)
    navigate(`/policies/${id}`)
  }

  return <DialogPrimitive.Root open={dialogOpen} onOpenChange={handleOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="policy-search-overlay" render={<motion.div
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={open ? { opacity: 1, backdropFilter: `blur(${shouldReduceMotion ? 1 : 2}px)` } : { opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={transition}
      />} />
      <DialogPrimitive.Popup className="policy-search-dialog" render={<motion.div
        initial={{ opacity: 0, transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(8px) scale(.985)' }}
        animate={open
          ? { opacity: 1, transform: 'translateY(0) scale(1)' }
          : { opacity: 0, transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(5px) scale(.99)' }}
        transition={transition}
        onAnimationComplete={() => { if (!open) setDialogOpen(false) }}
      />}>
        <DialogPrimitive.Title className="sr-only">Search policies</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Find a policy by its name, description, label, or creator.</DialogPrimitive.Description>
        <Command className="policy-command" label="Search policies" value={activePolicyId} onValueChange={setActivePolicyId}>
          <div className="policy-command-search"><Search aria-hidden="true" /><Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Search policies and labels…" /><kbd>ESC</kbd></div>
          <Command.List className="policy-command-results">
            <Command.Empty className="policy-command-empty">No policies match “{query}”.</Command.Empty>
            <Command.Group heading="POLICIES">
              {policies.map((policy) => <Command.Item key={policy.id} value={policy.id} keywords={[policy.name, policy.description, policy.labels.join(' '), policy.createdBy]} onSelect={() => openPolicy(policy.id)} className="policy-command-item">
                {activePolicyId === policy.id && (shouldReduceMotion ? <span className="policy-command-selection" aria-hidden="true" /> : <motion.span layoutId="policy-search-selection" className="policy-command-selection" transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} aria-hidden="true" />)}
                <span className="policy-command-icon"><FileText aria-hidden="true" /></span>
                <span className="policy-command-copy"><strong>{policy.name}</strong><small>{policy.description || policy.labels.join(' · ') || 'No summary yet'}</small></span>
                <PolicyStatusBadge policy={policy} />
              </Command.Item>)}
            </Command.Group>
          </Command.List>
          <div className="policy-command-footer"><span><kbd><ArrowUp /></kbd><kbd><ArrowDown /></kbd> to navigate</span><span><kbd><CornerDownLeft /></kbd> to open</span><span>{policies.length} policies</span></div>
        </Command>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
