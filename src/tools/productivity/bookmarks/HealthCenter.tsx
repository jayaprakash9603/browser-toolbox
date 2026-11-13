import { useTranslation } from 'react-i18next'

import {
  canonicalizeBookmarkUrl,
  isConfirmedBroken,
  isInconclusive,
  type BookmarkHealthRecord,
  type HealthKind,
} from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import type { BookmarkFolder, BookmarkRow } from './service'

const KINDS: HealthKind[] = ['broken', 'redirect', 'auth', 'timeout', 'network', 'invalid']

export function HealthCenter({
  health,
  rows,
  emptyFolders,
  missingTitles,
  scanning,
  progress,
  schedule,
  lastScanAt,
  onScanAll,
  onScanFolder,
  onToggleSchedule,
  onOpen,
}: {
  health: Record<string, BookmarkHealthRecord>
  rows: readonly BookmarkRow[]
  emptyFolders: readonly BookmarkFolder[]
  missingTitles: readonly BookmarkRow[]
  scanning: boolean
  progress: { done: number; total: number }
  schedule: 'off' | 'daily'
  lastScanAt?: number
  onScanAll: () => void
  onScanFolder: () => void
  onToggleSchedule: (on: boolean) => void
  onOpen: (row: BookmarkRow) => void
}) {
  const { t } = useTranslation()
  const byKind = (kind: HealthKind) =>
    rows.filter((row) => health[canonicalizeBookmarkUrl(row.url)]?.kind === kind)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={onScanAll} disabled={scanning}>
          {scanning ? t('bookmarks.health.scanning', progress) : t('bookmarks.health.scanAll')}
        </Button>
        <Button size="sm" variant="outline" onClick={onScanFolder} disabled={scanning}>
          {t('bookmarks.health.scanFolder')}
        </Button>
        <label className="ml-auto flex items-center gap-2 text-[12px]">
          {t('bookmarks.health.schedule')}
          <Switch checked={schedule === 'daily'} onCheckedChange={onToggleSchedule} />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {lastScanAt
          ? t('bookmarks.health.lastScan', { time: new Date(lastScanAt).toLocaleString() })
          : t('bookmarks.health.never')}
      </p>
      {KINDS.map((kind) => (
        <HealthGroup
          key={kind}
          title={t(`bookmarks.health.${kind === 'network' ? 'network' : kind}`)}
          hint={isInconclusive(kind) ? t('bookmarks.health.inconclusive') : undefined}
          rows={byKind(kind)}
          onOpen={onOpen}
          danger={isConfirmedBroken(kind)}
        />
      ))}
      <HealthGroup title={t('bookmarks.health.emptyFolders')} rows={emptyFolders.map((folder) => ({ id: folder.id, title: folder.title, url: '', folderPath: folder.path }))} onOpen={() => undefined} />
      <HealthGroup title={t('bookmarks.health.missingTitles')} rows={missingTitles} onOpen={onOpen} />
    </div>
  )
}

function HealthGroup({
  title,
  hint,
  rows,
  onOpen,
  danger,
}: {
  title: string
  hint?: string
  rows: readonly { id: string; title: string; url: string; folderPath: string }[]
  onOpen: (row: BookmarkRow) => void
  danger?: boolean
}) {
  if (!rows.length) return null
  return (
    <section className="rounded-[var(--radius)] border p-2.5">
      <h3 className={`text-[12px] font-semibold ${danger ? 'text-destructive' : ''}`}>
        {title} · {rows.length}
      </h3>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <ul className="mt-1.5 space-y-1">
        {rows.slice(0, 40).map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="w-full cursor-pointer truncate text-left text-[12px] hover:text-primary"
              onClick={() => onOpen(row as BookmarkRow)}
            >
              {row.title || row.url}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
