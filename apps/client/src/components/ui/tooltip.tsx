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

export function TooltipContent({ className = '', side = 'bottom', align = 'center', sideOffset = 8, ...props }: ComponentProps<typeof TooltipPrimitive.Popup> & { side?: ComponentProps<typeof TooltipPrimitive.Positioner>['side']; align?: ComponentProps<typeof TooltipPrimitive.Positioner>['align']; sideOffset?: number }) {
  return <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner side={side} align={align} sideOffset={sideOffset}>
      <TooltipPrimitive.Popup className={`ui-tooltip ${className}`} {...props} />
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
}
