import { useTranslation } from 'react-i18next'
import { BookmarkIcon, CopyIcon, ExternalLinkIcon, LinkIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import type { BookmarkRow } from './service'

export function BookmarkResultRow({
  row,
  highlighted,
  onCopyUrl,
  onCopyMarkdown,
  onOpen,
}: {
  row: BookmarkRow
  highlighted?: boolean
  onCopyUrl: () => void
  onCopyMarkdown: () => void
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: highlighted ? '0 0 0 2px color-mix(in srgb, var(--primary) 45%, transparent)' : undefined,
      }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group flex items-start gap-2.5 rounded-xl border bg-card p-2.5 shadow-xs',
        'transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-sm',
        highlighted && 'border-primary/40',
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <BookmarkIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium leading-snug text-foreground">{row.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{row.folderPath}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground/90">{row.url}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row sm:items-center">
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-8 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          aria-label={t('bookmarks.copyUrl')}
          title={t('bookmarks.copyUrl')}
          onClick={onCopyUrl}
        >
          <LinkIcon className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-8 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          aria-label={t('bookmarks.copyMarkdownLine')}
          title={t('bookmarks.copyMarkdownLine')}
          onClick={onCopyMarkdown}
        >
          <CopyIcon className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-8"
          aria-label={t('bookmarks.open')}
          title={t('bookmarks.open')}
          onClick={onOpen}
        >
          <ExternalLinkIcon className="size-4" />
        </Button>
      </div>
    </motion.article>
  )
}
