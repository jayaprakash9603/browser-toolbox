import { useTranslation } from 'react-i18next'
import { BookmarkIcon, CopyIcon, ExternalLinkIcon, LinkIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import type { BookmarkRow } from './service'

function bookmarkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

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
  const host = bookmarkHost(row.url)

  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: highlighted ? '0 0 0 1px color-mix(in srgb, var(--primary) 50%, transparent)' : undefined,
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group flex min-h-[2.75rem] items-center gap-2 rounded-lg border bg-card px-2 py-1.5',
        'transition-[border-color,background-color] duration-150 hover:border-primary/20 hover:bg-muted/15',
        highlighted && 'border-primary/35 bg-primary/[0.04]',
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <BookmarkIcon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium text-foreground">{row.title}</p>
        <p className="mt-px flex min-w-0 items-center gap-1 truncate text-[10px] text-muted-foreground">
          <span className="min-w-0 truncate">{row.folderPath}</span>
          <span aria-hidden className="shrink-0 text-muted-foreground/50">
            ·
          </span>
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground/85">{host}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-px">
        <Button
          size="icon-xs"
          variant="ghost"
          className="size-7 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          aria-label={t('bookmarks.copyUrl')}
          title={t('bookmarks.copyUrl')}
          onClick={onCopyUrl}
        >
          <LinkIcon className="size-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          className="size-7 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          aria-label={t('bookmarks.copyMarkdownLine')}
          title={t('bookmarks.copyMarkdownLine')}
          onClick={onCopyMarkdown}
        >
          <CopyIcon className="size-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          className="size-7"
          aria-label={t('bookmarks.open')}
          title={t('bookmarks.open')}
          onClick={onOpen}
        >
          <ExternalLinkIcon className="size-3.5" />
        </Button>
      </div>
    </motion.article>
  )
}
