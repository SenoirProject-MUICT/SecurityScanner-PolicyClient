import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import type { ComponentProps } from 'react'

export function TooltipProvider(props: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider {...props} />
}

export function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />
}

export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />
}

export function TooltipContent({ className = '', sideOffset = 8, ...props }: ComponentProps<typeof TooltipPrimitive.Popup> & { sideOffset?: number }) {
  return <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner sideOffset={sideOffset}>
      <TooltipPrimitive.Popup className={`ui-tooltip ${className}`} {...props} />
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
}
