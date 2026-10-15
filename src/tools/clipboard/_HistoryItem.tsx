import { useState } from 'react'
import { CheckIcon, ClipboardPasteIcon, CopyIcon, PinIcon, PinOffIcon, Trash2Icon } from 'lucide-react'
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
import { cn } from '@/shared/utils/cn'

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isLong(text: string): boolean {
  return text.length > 220 || text.split(/\r?\n/).length > 4
}

interface HistoryItemProps {
  entry: ClipboardEntry
  onChanged: () => void
}

export function HistoryItem({ entry, onChanged }: HistoryItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [notice, setNotice] = useState<'copied' | 'pasted' | 'ready' | null>(null)
  const long = isLong(entry.text)

  const flash = (next: 'copied' | 'pasted' | 'ready') => {
    setNotice(next)
    window.setTimeout(() => setNotice(null), 1600)
  }

  const copy = async () => {
    await writeClipboardText(entry.text)
    flash('copied')
  }

  const paste = async () => {
    const where = await pasteClipboardEntry(entry.text)
    flash(where === 'page' ? 'pasted' : 'ready')
  }

  return (
    <article className="rounded-lg border bg-card p-3 transition-colors hover:border-foreground/15">
      <pre
        className={cn(
          'font-sans text-xs leading-5 break-words whitespace-pre-wrap',
          !expanded && long && 'line-clamp-4',
          expanded && 'scrollbar-styled max-h-72 overflow-auto',
        )}
      >
        {entry.text}
      </pre>
      {long && (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="mt-1 h-auto px-0"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? t('clipboard.showLess') : t('clipboard.showAll')}
        </Button>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
        <span>{timeLabel(entry.createdAt)}</span>
        <span aria-hidden>·</span>
        <span>{t('common.chars', { count: entry.charCount })}</span>
        <span aria-hidden>·</span>
        <span>{t('common.words', { count: entry.wordCount })}</span>
        {entry.pinned && <PinIcon className="size-3 fill-amber-400 text-amber-400" aria-label={t('common.pin')} />}
        {notice && (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400" aria-live="polite">
            <CheckIcon className="size-3" aria-hidden />
            {t(`clipboard.${notice}`)}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" className="h-8" onClick={() => void copy()}>
          <CopyIcon /> {t('common.copy')}
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => void paste()}>
          <ClipboardPasteIcon /> {t('clipboard.paste')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          aria-pressed={entry.pinned}
          onClick={() => void pinEntry(entry.id, !entry.pinned).then(onChanged)}
        >
          {entry.pinned ? <PinOffIcon /> : <PinIcon />}
          {entry.pinned ? t('common.unpin') : t('common.pin')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void deleteEntry(entry.id).then(onChanged)}
        >
          <Trash2Icon /> {t('common.delete')}
        </Button>
      </div>
    </article>
  )
}

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
