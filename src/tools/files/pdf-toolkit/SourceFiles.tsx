import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowDownIcon, ArrowUpIcon, FilesIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { FileDropZone, FileGlyph, splitFileName } from '@/shared/components/files'
import { PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import type { SourceFile } from './useSourceFiles'

interface SourceFilesProps {
  files: SourceFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onMove?: (id: string, delta: number) => void
  onClear?: () => void
  accept: string
  title: string
  hint: string
  glyphs: [string, string, string]
  formats?: string[]
  multiple?: boolean
  /** Extra line under each file name, such as page count or a status. */
  describe?: (entry: SourceFile, index: number) => ReactNode
  /** Small preview drawn instead of the file glyph. */
  thumb?: (entry: SourceFile) => ReactNode
}

/** Drop zone first, then an ordered list with move, remove and add-more. */
export function SourceFiles({ files, onAdd, onRemove, onMove, onClear, accept, title, hint, glyphs, formats, multiple = true, describe, thumb }: SourceFilesProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  if (!files.length) return <FileDropZone title={title} hint={hint} accept={accept} glyphs={glyphs} formats={formats} multiple={multiple} onFiles={onAdd} />

  return (
    <PanelSection
      title={t('pdf.files.title', { count: files.length })}
      icon={<FilesIcon />}
      actions={
        <div className="flex items-center gap-1">
          <Button variant="outline" size="xs" onClick={() => input.current?.click()}>
            <PlusIcon aria-hidden />
            {multiple ? t('pdf.files.add') : t('pdf.files.replace')}
          </Button>
          {onClear && files.length > 1 && (
            <Button variant="ghost" size="icon-xs" onClick={onClear} aria-label={t('pdf.clearAll')}>
              <Trash2Icon />
            </Button>
          )}
          <input
            ref={input}
            type="file"
            accept={accept}
            multiple={multiple}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const picked = [...(event.target.files ?? [])]
              event.target.value = ''
              if (picked.length) onAdd(picked)
            }}
          />
        </div>
      }
    >
      <div
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const dropped = [...event.dataTransfer.files]
          if (dropped.length) onAdd(dropped)
        }}
        className={cn('rounded-xl transition-[box-shadow,background-color]', dragging && 'bg-primary/[0.04] outline-2 outline-offset-2 outline-primary/50 outline-dashed')}
      >
        <ol className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {files.map((entry, index) => {
              const { ext } = splitFileName(entry.file.name)
              return (
                <motion.li
                  key={entry.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  className="flex items-center gap-2.5 rounded-xl border bg-background/70 px-2 py-1.5"
                >
                  {multiple && <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-muted-foreground">{index + 1}</span>}
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60">
                    {thumb ? thumb(entry) : <FileGlyph extension={ext || '?'} className="h-8" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-medium" title={entry.file.name}>
                      {entry.file.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums text-muted-foreground">
                      <span>{formatBytes(entry.file.size)}</span>
                      {describe?.(entry, index)}
                    </span>
                  </div>
                  {onMove && files.length > 1 && (
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => onMove(entry.id, -1)} disabled={index === 0} aria-label={t('pdf.files.up', { name: entry.file.name })}>
                        <ArrowUpIcon />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => onMove(entry.id, 1)} disabled={index === files.length - 1} aria-label={t('pdf.files.down', { name: entry.file.name })}>
                        <ArrowDownIcon />
                      </Button>
                    </div>
                  )}
                  <Button variant="ghost" size="icon-xs" onClick={() => onRemove(entry.id)} aria-label={t('pdf.files.remove', { name: entry.file.name })}>
                    <XIcon />
                  </Button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      </div>
    </PanelSection>
  )
}
