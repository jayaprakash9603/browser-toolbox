import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'
import { useFileDrop } from './useFileDrop'

interface FileDropzoneProps {
  accept: string
  acceptLabel: string
  icon: LucideIcon
  title: string
  multiple?: boolean
  onFiles: (files: File[]) => void
}

export function FileDropzone({
  accept,
  acceptLabel,
  icon: Icon,
  title,
  multiple = false,
  onFiles,
}: FileDropzoneProps) {
  const { t } = useTranslation()
  const { active, handlers } = useFileDrop(onFiles)

  return (
    <label
      {...handlers}
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed bg-muted/20 px-4 py-8 text-center transition-colors duration-150',
        'hover:border-primary/40 hover:bg-primary/5 focus-within:has-[:focus-visible]:border-primary focus-within:has-[:focus-visible]:ring-2 focus-within:has-[:focus-visible]:ring-ring/40',
        active && 'border-primary bg-primary/10',
      )}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors duration-150 group-hover:border-primary/30 group-hover:text-primary',
          active && 'border-primary/40 text-primary',
        )}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-medium text-foreground">
        {active ? t('files.drop.active') : title}
      </span>
      <span className="text-xs text-muted-foreground">
        {t('files.drop.browse')} · {t('files.accepts', { types: acceptLabel })}
      </span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        aria-label={title}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
    </label>
  )
}
