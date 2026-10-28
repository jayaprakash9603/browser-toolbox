import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, CopyIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import type { BookmarkRow } from './service'
import { exportBookmarksMarkdown } from './service'

const PREVIEW_LINES = 6

export function BookmarkExportPreview({
  rows,
  onCopy,
}: {
  rows: BookmarkRow[]
  onCopy: () => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const markdown = exportBookmarksMarkdown(rows)
  const lines = markdown.split('\n')
  const preview = lines.slice(0, PREVIEW_LINES).join('\n')
  const rest = lines.length - PREVIEW_LINES

  return (
    <section className="rounded-xl border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left outline-none',
          'transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <ChevronDownIcon
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-foreground">{t('bookmarks.previewTitle')}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{t('bookmarks.previewHint', { count: rows.length })}</span>
        </span>
        <Button
          type="button"
          size="xs"
          variant="secondary"
          className="shrink-0"
          onClick={(event) => {
            event.stopPropagation()
            onCopy()
          }}
        >
          <CopyIcon />
          {t('bookmarks.copyMarkdown')}
        </Button>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <pre className="max-h-36 overflow-auto border-t bg-background/80 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              {preview}
              {rest > 0 ? `\n… ${t('bookmarks.previewMore', { count: rest })}` : null}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
