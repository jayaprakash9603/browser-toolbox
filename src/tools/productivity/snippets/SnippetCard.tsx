import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BracesIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CopyPlusIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  SlidersHorizontalIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import {
  extractCustomVariables,
  extractSnippetVariables,
  snippetStats,
  type Snippet,
} from './model'

interface SnippetCardProps {
  snippet: Snippet
  copied: boolean
  onCopy: (snippet: Snippet) => void
  onFillAndCopy: (snippet: Snippet) => void
  onTogglePin: (id: string) => void
  onDuplicate: (snippet: Snippet) => void
  onEdit: (snippet: Snippet) => void
  onDelete: (snippet: Snippet) => void
  onTagClick: (tag: string) => void
}

export function SnippetCard({
  snippet,
  copied,
  onCopy,
  onFillAndCopy,
  onTogglePin,
  onDuplicate,
  onEdit,
  onDelete,
  onTagClick,
}: SnippetCardProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [expanded, setExpanded] = useState(false)

  const stats = snippetStats(snippet.body)
  const allTokens = extractSnippetVariables(snippet.body)
  const customVars = extractCustomVariables(snippet.body)
  const isLong = stats.lines > 4 || stats.chars > 220

  return (
    <motion.article
      layout={!reduce}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border bg-card p-3 shadow-xs',
        'transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/35 hover:shadow-sm',
        snippet.pinned && 'border-primary/25 bg-primary/[0.025]',
        copied && 'border-emerald-500/50 bg-emerald-500/[0.04] shadow-sm',
      )}
    >
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {snippet.pinned && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
                  <PinIcon className="size-3" aria-hidden />
                </span>
              )}
              <h3 className="truncate text-[13.5px] font-semibold tracking-tight text-foreground">
                {snippet.title}
              </h3>
              {snippet.shortcut && (
                <span className="shrink-0 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                  {snippet.shortcut}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                <TagIcon className="size-2.5 text-primary/80" aria-hidden />
                {snippet.category}
              </span>
              {snippet.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick(tag)}
                  className="cursor-pointer rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  #{tag}
                </button>
              ))}
              {allTokens.length > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9.5px] text-amber-600 dark:text-amber-400">
                  <BracesIcon className="size-2.5" aria-hidden />
                  {allTokens.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {customVars.length > 0 && (
              <Button
                size="xs"
                variant="secondary"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => onFillAndCopy(snippet)}
              >
                <SlidersHorizontalIcon className="size-3" />
                {t('snippets.fillAndCopy')}
              </Button>
            )}
            <Button
              size="xs"
              variant={copied ? 'secondary' : 'default'}
              className={cn(
                'h-7 gap-1 px-2.5 text-[11px] transition-colors',
                copied &&
                  'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              )}
              aria-label={t('snippets.copy')}
              onClick={() => onCopy(snippet)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="inline-flex items-center"
                  >
                    <CheckIcon className="size-3.5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="inline-flex items-center"
                  >
                    <CopyIcon className="size-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="hidden @[340px]:inline">{t('snippets.copy')}</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <pre
            onClick={() => onCopy(snippet)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCopy(snippet)
              }
            }}
            aria-label={t('snippets.copy')}
            className={cn(
              'scrollbar-styled cursor-pointer overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-muted/45 p-2.5 font-mono text-[11px] leading-relaxed text-foreground/90 transition-colors hover:border-primary/25 hover:bg-muted/65 focus-visible:ring-2 focus-visible:ring-ring outline-none',
              expanded ? 'max-h-64' : 'max-h-24',
            )}
          >
            {snippet.body || t('snippets.noBody')}
          </pre>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 pt-0.5">
        <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
          <span className="truncate">{t('snippets.stats', stats)}</span>
          {(snippet.useCount ?? 0) > 0 && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-px font-medium text-primary">
              {t('snippets.usedCount', { count: snippet.useCount })}
            </span>
          )}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? t('snippets.collapse') : t('snippets.expand')}
              className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 font-medium text-primary hover:underline"
            >
              <ChevronDownIcon
                className={cn('size-3 transition-transform duration-200', expanded && 'rotate-180')}
              />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-75 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={snippet.pinned ? t('snippets.unpin') : t('snippets.pin')}
            title={snippet.pinned ? t('snippets.unpin') : t('snippets.pin')}
            onClick={() => onTogglePin(snippet.id)}
          >
            {snippet.pinned ? (
              <PinOffIcon className="size-3.5 text-primary" />
            ) : (
              <PinIcon className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t('snippets.duplicate')}
            title={t('snippets.duplicate')}
            onClick={() => onDuplicate(snippet)}
          >
            <CopyPlusIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t('snippets.edit')}
            title={t('snippets.edit')}
            onClick={() => onEdit(snippet)}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            aria-label={t('snippets.delete')}
            title={t('snippets.delete')}
            onClick={() => onDelete(snippet)}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
