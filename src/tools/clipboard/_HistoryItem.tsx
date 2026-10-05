import { useState } from 'react'
import { ClipboardPasteIcon, PinIcon, PinOffIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'

import {
  clearHistory,
  deleteEntry,
  pinEntry,
  writeClipboardText,
  type ClipboardEntry,
} from '@/core/clipboard'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'

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
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        <article className="group rounded-md border p-2.5 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="mb-1.5 line-clamp-2 text-xs break-all whitespace-pre-wrap">{entry.text}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{timeLabel(entry.createdAt)}</span>
            <span>·</span>
            <span>{t('common.chars', { count: entry.charCount })}</span>
            <span>·</span>
            <span>{t('common.words', { count: entry.wordCount })}</span>
            {entry.pinned && <PinIcon className="size-3 fill-amber-400 text-amber-400" />}
          </div>
        </article>
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="z-50 min-w-36 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <ContextMenuPrimitive.Item
            className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none focus:bg-accent focus:text-accent-foreground"
            onSelect={() => void copy()}
          >
            <ClipboardPasteIcon className="size-3.5" />
            {t('common.copyAgain')}
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item
            className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none focus:bg-accent focus:text-accent-foreground"
            onSelect={() => void pinEntry(entry.id, !entry.pinned).then(onChanged)}
          >
            {entry.pinned ? <PinOffIcon className="size-3.5" /> : <PinIcon className="size-3.5" />}
            {entry.pinned ? t('common.unpin') : t('common.pin')}
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Separator className="my-1 h-px bg-border" />
          <ContextMenuPrimitive.Item
            className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive outline-none focus:bg-destructive/10"
            onSelect={() => void deleteEntry(entry.id).then(onChanged)}
          >
            <Trash2Icon className="size-3.5" />
            {t('common.delete')}
          </ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
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
