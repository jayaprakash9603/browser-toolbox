import { useState } from 'react'
import { ClipboardPasteIcon, PinIcon, PinOffIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  clearHistory,
  deleteEntry,
  pinEntry,
  writeClipboardText,
  type ClipboardEntry,
} from '@/core/clipboard'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface HistoryItemProps {
  entry: ClipboardEntry
  onChanged: () => void
}

export function HistoryItem({ entry, onChanged }: HistoryItemProps) {
  const { t } = useTranslation()
  const copy = async () => {
    await writeClipboardText(entry.text)
  }

  return (
    <div className="group rounded-md border p-2.5 transition-colors hover:border-foreground/20">
      <p className="mb-1.5 line-clamp-2 text-xs break-all whitespace-pre-wrap">{entry.text}</p>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{timeLabel(entry.createdAt)}</span>
        <span>·</span>
        <span>{t('common.chars', { count: entry.charCount })}</span>
        <span>·</span>
        <span>{t('common.words', { count: entry.wordCount })}</span>
        {entry.pinned && <PinIcon className="size-3 fill-amber-400 text-amber-400" />}
        <div className="flex-1" />
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <ItemButton label={t('common.copyAgain')} onClick={() => void copy()}>
            <ClipboardPasteIcon />
          </ItemButton>
          <ItemButton
            label={entry.pinned ? t('common.unpin') : t('common.pin')}
            onClick={() => void pinEntry(entry.id, !entry.pinned).then(onChanged)}
          >
            {entry.pinned ? <PinOffIcon /> : <PinIcon />}
          </ItemButton>
          <ItemButton
            label={t('common.delete')}
            onClick={() => void deleteEntry(entry.id).then(onChanged)}
          >
            <Trash2Icon />
          </ItemButton>
        </div>
      </div>
    </div>
  )
}

function ItemButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
