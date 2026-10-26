import { cn } from '@/shared/utils/cn'
import type { ImageSaveFormat } from '@/core/imageConvert'

import { FORMAT_TONE } from './formatMeta'

export function FormatBadge({ format, size = 'md', className }: { format: ImageSaveFormat; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-mono font-bold uppercase tracking-wide',
        size === 'sm' ? 'h-6 w-9 text-[9px]' : 'size-9 text-[10px]',
        FORMAT_TONE[format],
        className,
      )}
    >
      {format}
    </span>
  )
}
