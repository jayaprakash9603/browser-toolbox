import * as React from 'react'

import { cn } from '@/shared/utils/cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-[13px] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-muted/30',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
