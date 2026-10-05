import type { LucideIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}>
      <Icon className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="max-w-56 text-xs text-muted-foreground/70">{description}</p>}
    </div>
  )
}
