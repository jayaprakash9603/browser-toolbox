import * as React from 'react'

import { cn } from '@/shared/utils/cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'scrollbar-styled flex min-h-[72px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-muted/30',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
