import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  AtSignIcon,
  CheckIcon,
  ClipboardPasteIcon,
  CodeXmlIcon,
  HashIcon,
  LinkIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  clearHistory,
  deleteEntry,
  pasteClipboardEntry,
  pinEntry,
  writeClipboardText,
  type ClipboardEntry,
} from '@/core/clipboard'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import { classifyClip, relativeTime, type ClipKind } from './clipKinds'

type Notice = 'copied' | 'pasted' | 'ready'

const KIND_STYLE: Record<ClipKind, { icon: LucideIcon; tone: string }> = {
  link: { icon: LinkIcon, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  email: { icon: AtSignIcon, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' },
  color: { icon: HashIcon, tone: 'bg-muted text-muted-foreground' },
  code: { icon: CodeXmlIcon, tone: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  number: { icon: HashIcon, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  text: { icon: TypeIcon, tone: 'bg-primary/10 text-primary' },
}

function isLong(text: string): boolean {
  return text.length > 220 || text.split(/\r?\n/).length > 4
}

function KindBadge({ kind, text, label }: { kind: ClipKind; text: string; label: string }) {
  if (kind === 'color') {
    return (
      <span
        className="mt-0.5 size-8 shrink-0 rounded-lg shadow-inner ring-1 ring-foreground/10"
        style={{ background: text.trim() }}
        role="img"
        aria-label={label}
      />
    )
  }
  const { icon: Icon, tone } = KIND_STYLE[kind]
  return (
    <span
      className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', tone)}
      role="img"
      aria-label={label}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  )
}

function IconAction({
  label,
  onClick,
  pressed,
  className,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn('text-muted-foreground hover:text-foreground', className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

interface HistoryItemProps {
  entry: ClipboardEntry
  onChanged: () => void
  onDelete?: (entry: ClipboardEntry) => void
  fresh?: boolean
  now?: number
}

export const HistoryItem = memo(function HistoryItem({
  entry,
  onChanged,
  onDelete,
  fresh = false,
  now,
}: HistoryItemProps) {
  const { t, i18n } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const kind = useMemo(() => classifyClip(entry.text), [entry.text])
  const long = isLong(entry.text)
  const mono = kind === 'link' || kind === 'email' || kind === 'code' || kind === 'color'
  const textId = `clip-text-${entry.id}`

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const flash = (next: Notice) => {
    window.clearTimeout(timer.current)
    setNotice(next)
    timer.current = window.setTimeout(() => setNotice(null), 1400)
  }

  const copy = async () => {
    await writeClipboardText(entry.text)
    flash('copied')
  }

  const paste = async () => {
    const where = await pasteClipboardEntry(entry.text)
    flash(where === 'page' ? 'pasted' : 'ready')
  }

  const remove = () => {
    if (onDelete) onDelete(entry)
    else void deleteEntry(entry.id).then(onChanged)
  }

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,background-color] duration-200',
        'hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)] focus-within:border-primary/40',
        entry.pinned && 'border-amber-400/45 bg-amber-50/50 dark:bg-amber-400/[0.05]',
      )}
    >
      {fresh && !reduceMotion && (
        <motion.span
          key={entry.createdAt}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary/60 ring-inset"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      )}

      <button
        type="button"
        data-clip-copy
        aria-label={t('common.copy')}
        aria-describedby={textId}
        onClick={() => void copy()}
        className="flex w-full cursor-pointer items-start gap-3 px-3 pt-3 pb-1.5 text-left outline-none transition-colors focus-visible:bg-accent/50"
      >
        <KindBadge kind={kind} text={entry.text} label={t(`clipboard.kind.${kind}`)} />
        <span
          id={textId}
          className={cn(
            'min-w-0 flex-1 break-words whitespace-pre-wrap text-[13px] leading-5 text-foreground',
            mono && 'font-mono text-xs leading-5',
            expanded ? 'scrollbar-styled block max-h-72 overflow-auto' : 'line-clamp-4',
          )}
        >
          {entry.text}
        </span>
      </button>

      <div className="flex items-center gap-2 pr-2 pb-2 pl-14">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
          <time
            dateTime={new Date(entry.createdAt).toISOString()}
            title={new Date(entry.createdAt).toLocaleString()}
          >
            {relativeTime(entry.createdAt, now, i18n.language)}
          </time>
          <span aria-hidden>·</span>
          <span>{t('common.chars', { count: entry.charCount })}</span>
          {entry.wordCount > 1 && (
            <>
              <span aria-hidden>·</span>
              <span>{t('common.words', { count: entry.wordCount })}</span>
            </>
          )}
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls={textId}
              className="ml-1 cursor-pointer rounded font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expanded ? t('clipboard.showLess') : t('clipboard.showAll')}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-75 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
          <IconAction label={t('clipboard.paste')} onClick={() => void paste()}>
            <ClipboardPasteIcon />
          </IconAction>
          <IconAction
            label={entry.pinned ? t('common.unpin') : t('common.pin')}
            pressed={entry.pinned}
            onClick={() => void pinEntry(entry.id, !entry.pinned).then(onChanged)}
            className={cn(entry.pinned && 'text-amber-500 hover:text-amber-600')}
          >
            {entry.pinned ? <PinOffIcon /> : <PinIcon />}
          </IconAction>
          <IconAction
            label={t('common.delete')}
            onClick={remove}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon />
          </IconAction>
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {notice ? t(`clipboard.${notice}`) : ''}
      </span>
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice}
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/75 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
          >
            <motion.span
              initial={reduceMotion ? false : { scale: 0.85, y: 4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg"
            >
              <CheckIcon className="size-3.5" />
              {t(`clipboard.${notice}`)}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
})

export function ClearHistoryButton({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        {t('common.clearAll')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('clipboard.clearTitle')}
        description={t('clipboard.clearDescription')}
        confirmLabel={t('common.clear')}
        destructive
        onConfirm={() => void clearHistory(false).then(onChanged)}
      />
    </>
  )
}
