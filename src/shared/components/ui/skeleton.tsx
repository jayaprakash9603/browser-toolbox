import type { ComponentProps } from 'react'

import { cn } from '@/shared/utils/cn'

export function Skeleton({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('block animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)}
      aria-hidden
      {...props}
    />
  )
}
