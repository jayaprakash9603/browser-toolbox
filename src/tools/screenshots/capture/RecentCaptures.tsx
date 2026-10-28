import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowUpRightIcon,
  ClipboardCopyIcon,
  DownloadIcon,
  HistoryIcon,
  ImagesIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'

import { copyImageBlobToClipboard, downloadBlobInExtension } from '@/core/screenshot/export'
import {
  addScreenshotHistory,
  deleteScreenshotHistory,
  historyEntryExtension,
  historyEntryFilename,
  listScreenshotHistory,
  watchScreenshotHistory,
  type ScreenshotHistoryEntry,
} from '@/core/screenshot/history'
import { captureViewerUrl } from '@/core/screenshot/viewerUrl'
import { EmptyState } from '@/shared/components/EmptyState'
import { useToast } from '@/shared/components/toast/useToast'
import { PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

const RECENT_LIMIT = 6

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

function timeAgo(timestamp: number, locale: string, now = Date.now()): string {
  const diff = timestamp - now
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) < ms) continue
    if (unit === 'day' && Math.abs(diff) >= 7 * ms) {
      return new Date(timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    }
    return format.format(Math.round(diff / ms), unit)
  }
  return format.format(0, 'second')
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

function openHistory() {
  void chrome.tabs.create({ url: captureViewerUrl({ history: true }) })
}

function CardAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          disabled={disabled}
          className={cn('text-muted-foreground hover:text-foreground', className)}
          onClick={onClick}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function CaptureCard({
  entry,
  onCopy,
  onDelete,
}: {
  entry: ScreenshotHistoryEntry
  onCopy: (entry: ScreenshotHistoryEntry) => void
  onDelete: (entry: ScreenshotHistoryEntry) => void
}) {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const host = hostOf(entry.url)
  const when = timeAgo(entry.createdAt, i18n.language)

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="group/card flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background/70 shadow-xs transition-shadow duration-200 hover:shadow-md"
    >
      <button
        type="button"
        onClick={openHistory}
        aria-label={t('capture.recent.open', { title: entry.title })}
        className="relative block aspect-[16/10] cursor-pointer overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top transition-transform duration-500 ease-out group-hover/card:scale-105"
          />
        ) : (
          <ImagesIcon className="m-auto size-6 text-muted-foreground/50" aria-hidden />
        )}
        <span className="absolute top-1.5 left-1.5 rounded-md bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-foreground uppercase shadow-sm backdrop-blur">
          {historyEntryExtension(entry)}
        </span>
      </button>
      <div className="flex min-w-0 items-end gap-1 p-1.5 pl-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={entry.title}>
            {entry.title}
          </p>
          <p className="truncate text-[10px] text-muted-foreground" title={new Date(entry.createdAt).toLocaleString(i18n.language)}>
            {host ? `${host} · ${when}` : when}
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-end gap-0.5 border-t px-1 py-0.5">
        <CardAction
          label={t('capture.recent.save')}
          icon={DownloadIcon}
          onClick={() => void downloadBlobInExtension(entry.blob, historyEntryFilename(entry))}
        />
        <CardAction
          label={t('capture.recent.copy')}
          icon={ClipboardCopyIcon}
          disabled={!entry.blob.type.startsWith('image/')}
          onClick={() => onCopy(entry)}
        />
        <CardAction
          label={t('capture.recent.delete')}
          icon={Trash2Icon}
          className="hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(entry)}
        />
      </div>
    </motion.li>
  )
}

/** The latest saved captures, kept in sync with saves and deletes made in other tabs. */
export function RecentCaptures() {
  const { t } = useTranslation()
  const { show } = useToast()
  const [entries, setEntries] = useState<ScreenshotHistoryEntry[] | null>(null)

  const refresh = useCallback(() => {
    void listScreenshotHistory().then(setEntries)
  }, [])

  useEffect(() => {
    refresh()
    return watchScreenshotHistory(refresh)
  }, [refresh])

  const copy = (entry: ScreenshotHistoryEntry) => {
    void copyImageBlobToClipboard(entry.blob).then(
      () => show(t('capture.recent.copied'), { variant: 'success' }),
      () => show(t('capture.recent.copyFailed'), { variant: 'error' }),
    )
  }

  const remove = (entry: ScreenshotHistoryEntry) => {
    setEntries((current) => current?.filter((item) => item.id !== entry.id) ?? current)
    void deleteScreenshotHistory(entry.id).then(() =>
      show(t('capture.recent.deleted'), { undo: () => void addScreenshotHistory(entry).then(refresh) }),
    )
  }

  const visible = entries?.slice(0, RECENT_LIMIT) ?? []

  return (
    <PanelSection
      title={t('capture.launcher.history')}
      icon={<HistoryIcon />}
      actions={
        <Button variant="ghost" size="xs" onClick={openHistory}>
          {entries && entries.length > 0
            ? t('capture.recent.openAll', { count: entries.length })
            : t('capture.launcher.historyOpen')}
          <ArrowUpRightIcon />
        </Button>
      }
    >
      {entries === null ? (
        <ul className="grid grid-cols-2 gap-2 @[560px]:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="aspect-[16/13] animate-pulse rounded-xl bg-muted" />
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ImagesIcon}
          title={t('capture.launcher.historyEmpty')}
          description={t('capture.recent.emptyHint')}
          className="py-6"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-2 @[560px]:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((entry) => (
              <CaptureCard key={entry.id} entry={entry} onCopy={copy} onDelete={remove} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </PanelSection>
  )
}
