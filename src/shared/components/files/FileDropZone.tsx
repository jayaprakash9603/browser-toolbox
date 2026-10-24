import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { ArrowUpIcon, PlusIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'
import { FileGlyph } from './FileGlyph'
import { useFileDrop } from './useFileDrop'

interface FileDropZoneProps {
  title: string
  /** Defaults to a generic "drop or browse" line. */
  hint?: ReactNode
  /** Short labels shown as chips, e.g. ["CSV", "JSON"]. */
  formats?: string[]
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  /** Slim bar for adding more files once a list exists. */
  compact?: boolean
  /** Three extensions drawn in the illustration. */
  glyphs?: [string, string, string]
  /** Accessible name of the file input; defaults to the title. */
  inputLabel?: string
  className?: string
}

const SPRING = { type: 'spring', stiffness: 320, damping: 22 } as const

const LEFT: Variants = {
  idle: { x: -30, y: 8, rotate: -14 },
  hover: { x: -40, y: 2, rotate: -20 },
  active: { x: -50, y: -4, rotate: -26 },
}
const RIGHT: Variants = {
  idle: { x: 30, y: 8, rotate: 14 },
  hover: { x: 40, y: 2, rotate: 20 },
  active: { x: 50, y: -4, rotate: 26 },
}
const CENTER: Variants = {
  idle: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.04 },
  active: { y: -12, scale: 1.1 },
}

export function FileDropZone({
  title,
  hint,
  formats,
  accept,
  multiple = false,
  onFiles,
  compact = false,
  glyphs = ['PDF', 'DOCX', 'ZIP'],
  inputLabel,
  className,
}: FileDropZoneProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { active, handlers } = useFileDrop(onFiles)
  const [hovered, setHovered] = useState(false)
  const state = active ? 'active' : hovered ? 'hover' : 'idle'
  const defaultHint = multiple ? t('fileui.browseHint') : t('fileui.browseHintSingle')

  const input = (
    <input
      type="file"
      accept={accept}
      multiple={multiple}
      className="sr-only"
      aria-label={inputLabel ?? title}
      onChange={(event) => {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ''
        if (files.length > 0) onFiles(files)
      }}
    />
  )

  if (compact) {
    return (
      <label
        {...handlers}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-card/70 px-3 py-2 transition-[border-color,background-color,box-shadow] duration-200',
          'hover:border-primary/45 hover:bg-primary/[0.04] has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
          active && 'border-primary bg-primary/[0.07] shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_12%,transparent)]',
          className,
        )}
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105',
            active && 'scale-110',
          )}
          aria-hidden
        >
          <PlusIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{active ? t('fileui.release') : title}</span>
          <span className="block truncate text-xs text-muted-foreground">{hint ?? defaultHint}</span>
        </span>
        {input}
      </label>
    )
  }

  return (
    <label
      {...handlers}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        'group relative isolate flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed px-4 pt-7 pb-5 text-center transition-[border-color,background-color,box-shadow] duration-200',
        'border-border bg-card/60 hover:border-primary/45 has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
        active && 'border-solid border-primary bg-primary/[0.06] shadow-[0_0_0_6px_color-mix(in_srgb,var(--primary)_12%,transparent)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
        style={{
          backgroundImage: 'radial-gradient(color-mix(in srgb, var(--primary) 22%, transparent) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0 left-1/2 -z-10 h-40 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl transition-opacity duration-300',
          active ? 'opacity-100' : 'opacity-50 group-hover:opacity-80',
        )}
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--hero-from) 45%, transparent), color-mix(in srgb, var(--hero-to) 25%, transparent) 55%, transparent 75%)',
        }}
      />

      <motion.div
        aria-hidden
        className={cn('relative mb-2 h-[5.5rem] w-40', !reduce && state === 'idle' && 'hero-float-icon')}
        initial={false}
        animate={reduce ? 'idle' : state}
      >
        <motion.div className="absolute top-2 left-1/2 -ml-[18px]" variants={LEFT} transition={SPRING}>
          <FileGlyph extension={glyphs[0]} className="h-14 opacity-90" />
        </motion.div>
        <motion.div className="absolute top-2 left-1/2 -ml-[18px]" variants={RIGHT} transition={SPRING}>
          <FileGlyph extension={glyphs[2]} className="h-14 opacity-90" />
        </motion.div>
        <motion.div className="absolute top-0 left-1/2 -ml-[23px]" variants={CENTER} transition={SPRING}>
          <FileGlyph extension={glyphs[1]} className="h-[4.25rem] drop-shadow-md" />
          <span className="absolute -right-2 -bottom-1.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card">
            {active && !reduce && (
              <motion.span
                className="absolute inset-0 rounded-full bg-primary"
                initial={{ scale: 1, opacity: 0.55 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <ArrowUpIcon className={cn('relative size-3.5 transition-transform duration-200', state !== 'idle' && '-translate-y-px')} />
          </span>
        </motion.div>
      </motion.div>

      <span className="text-sm font-semibold tracking-tight text-foreground">{active ? t('fileui.release') : title}</span>
      <span className="max-w-sm text-xs text-muted-foreground">{hint ?? defaultHint}</span>
      {formats && formats.length > 0 && (
        <span role="list" className="mt-2 flex max-w-md flex-wrap justify-center gap-1" aria-label={t('fileui.formatsLabel')}>
          {formats.map((format) => (
            <span
              key={format}
              role="listitem"
              className="rounded-full border bg-background/80 px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground"
            >
              {format}
            </span>
          ))}
        </span>
      )}
      {input}
    </label>
  )
}
