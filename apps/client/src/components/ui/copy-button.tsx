import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

type ButtonProps = ComponentProps<typeof Button>

export interface CopyButtonProps extends Omit<ButtonProps, 'onCopy' | 'onClick'> {
  content: string
  delay?: number
  onCopy?: (content: string) => undefined | boolean
  onCopyError?: (error: unknown) => void
  isCopied?: boolean
  onCopyChange?: (isCopied: boolean) => void
  onClick?: ButtonProps['onClick']
}

export function CopyButton({ content, delay = 3000, onClick, onCopy, onCopyError, isCopied, onCopyChange, size = 'icon', ...props }: CopyButtonProps) {
  const [localIsCopied, setLocalIsCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const copied = isCopied ?? localIsCopied
  const Icon = copied ? CheckIcon : CopyIcon

  useEffect(() => () => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current) }, [])

  const setCopied = useCallback((next: boolean) => {
    if (isCopied === undefined) setLocalIsCopied(next)
    onCopyChange?.(next)
  }, [isCopied, onCopyChange])

  async function handleClick(event: Parameters<NonNullable<ButtonProps['onClick']>>[0]) {
    onClick?.(event)
    if (event.defaultPrevented || copied || !content || onCopy?.(content) === false) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), delay)
    } catch (error) {
      setCopied(false)
      onCopyError?.(error)
    }
  }

  return <Button data-slot="copy-button" onClick={(event) => void handleClick(event)} size={size} {...props}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={localIsCopied ? 'check' : 'copy'} data-slot="copy-button-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
        <Icon />
      </motion.span>
    </AnimatePresence>
  </Button>
}

export default CopyButton
