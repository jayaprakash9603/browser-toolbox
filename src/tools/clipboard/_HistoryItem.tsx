import { useState } from 'react'
import { ClipboardPasteIcon, PinIcon, PinOffIcon, Trash2Icon } from 'lucide-react'

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
  const copy = async () => {
    await writeClipboardText(entry.text)
  }

  return (
    <div className="group rounded-md border p-2.5 transition-colors hover:border-foreground/20">
      <p className="mb-1.5 line-clamp-2 text-xs break-all whitespace-pre-wrap">{entry.text}</p>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{timeLabel(entry.createdAt)}</span>
        <span>·</span>
        <span>{entry.charCount} chars</span>
        <span>·</span>
        <span>{entry.wordCount} words</span>
        {entry.pinned && <PinIcon className="size-3 fill-amber-400 text-amber-400" />}
        <div className="flex-1" />
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <ItemButton label="Copy again" onClick={() => void copy()}>
            <ClipboardPasteIcon />
          </ItemButton>
          <ItemButton
            label={entry.pinned ? 'Unpin' : 'Pin'}
            onClick={() => void pinEntry(entry.id, !entry.pinned).then(onChanged)}
          >
            {entry.pinned ? <PinOffIcon /> : <PinIcon />}
          </ItemButton>
          <ItemButton
            label="Delete"
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
  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Clear all
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Clear clipboard history?"
        description="Pinned items are kept. Delete them individually to remove them."
        confirmLabel="Clear"
        destructive
        onConfirm={() => void clearHistory(false).then(onChanged)}
      />
    </>
  )
}
