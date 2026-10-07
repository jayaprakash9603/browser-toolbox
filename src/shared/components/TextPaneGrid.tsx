import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface TextPaneGridProps {
  children: ReactNode
  split?: boolean
  className?: string
}

export function TextPaneGrid({ children, split = true, className }: TextPaneGridProps) {
  return (
    <div
      className={cn(
        'grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3',
        split ? 'grid-rows-2 @[600px]:grid-cols-2 @[600px]:grid-rows-1' : 'grid-rows-1',
        className,
      )}
    >
      {children}
    </div>
  )
}