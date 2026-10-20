import {
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ListIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  buildBackup,
  clearNetLog,
  formatAvailability,
  formatClockDuration,
  formatDateTime,
  formatDuration,
  formatStatus,
  generalStats,
  logRows,
  logToCsv,
  logToPdf,
  parseBackup,
  setNetEvents,
  type NetDateFormat,
  type NetEvent,
  type NetMonitorBackup,
  type NetMonitorSettings,
  type NetMonitorSettingsPatch,
} from '@/core/netmon'
import { StatusBadge } from '@/features/netmon/components/StatusBadge'
import { downloadBlob, exportFilename } from '@/features/netmon/download'
import { useNow } from '@/features/netmon/hooks'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'

import { EmptyState, Panel } from './ui'

const PAGE = 100
const DATE_FORMATS: { value: NetDateFormat; key: string }[] = [
  { value: 'default', key: 'netmon.log.dateDefault' },
  { value: 'us', key: 'netmon.log.dateUs' },
  { value: 'eu', key: 'netmon.log.dateEu' },
  { value: 'iso', key: 'netmon.log.dateIso' },
]

export function LogTab({
  events,
  settings,
  patch,
}: {
  events: NetEvent[]
  settings: NetMonitorSettings
  patch: (next: NetMonitorSettingsPatch) => Promise<void>
}) {
  const { t } = useTranslation()
  const now = useNow(5000)
  const options = settings.log
  const rows = useMemo(() => logRows(events, now, options.simplify), [events, now, options.simplify])
  const [visible, setVisible] = useState(PAGE)
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<NetMonitorBackup | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportCsv = () => {
    downloadBlob(new Blob([logToCsv(rows, options)], { type: 'text/csv;charset=utf-8' }), exportFilename('csv'))
  }

  const exportPdf = async () => {
    const stats = generalStats(events, Date.now())
    const summary = (['today', 'week', 'month', 'all'] as const).map((key) => ({
      label: t(`netmon.general.${key}`),
      value: `${formatAvailability(stats[key].availability)} · ${stats[key].disconnects} ${t('netmon.general.disconnects').toLowerCase()} · ${formatClockDuration(stats[key].downtimeMs)} ${t('netmon.general.downtime').toLowerCase()}`,
    }))
    downloadBlob(await logToPdf(rows, options, summary), exportFilename('pdf'))
  }

  const exportBackup = () => {
    const json = JSON.stringify(buildBackup(settings, events), null, 2)
    downloadBlob(new Blob([json], { type: 'application/json' }), exportFilename('json'))
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPendingRestore(parseBackup(await file.text()))
      setNotice(null)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const restore = async (backup: NetMonitorBackup) => {
    await setNetEvents(backup.events)
    if (backup.settings) await patch({ ...backup.settings, enabled: settings.enabled })
    setNotice({ tone: 'ok', text: t('netmon.log.restored', { count: backup.events.length }) })
  }

  return (
    <Panel
      description={t('netmon.log.count', { count: rows.length })}
      actions={
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="xs" className="gap-1">
                <SlidersHorizontalIcon aria-hidden />
                {t('netmon.log.options')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-3">
              <OptionRow label={t('netmon.log.dateFormat')}>
                <Select value={options.dateFormat} onValueChange={(v) => void patch({ log: { dateFormat: v as NetDateFormat } })}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {t(f.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OptionRow>
              <OptionRow label={t('netmon.log.statusFormat')}>
                <Segmented
                  size="sm"
                  ariaLabel={t('netmon.log.statusFormat')}
                  value={options.statusFormat}
                  onValueChange={(v) => void patch({ log: { statusFormat: v } })}
                  options={[
                    { value: 'human', label: t('netmon.log.human') },
                    { value: 'system', label: t('netmon.log.system') },
                  ]}
                />
              </OptionRow>
              <OptionRow label={t('netmon.log.durationFormat')}>
                <Segmented
                  size="sm"
                  ariaLabel={t('netmon.log.durationFormat')}
                  value={options.durationFormat}
                  onValueChange={(v) => void patch({ log: { durationFormat: v } })}
                  options={[
                    { value: 'human', label: t('netmon.log.durationHuman') },
                    { value: 'seconds', label: t('netmon.log.durationSeconds') },
                  ]}
                />
              </OptionRow>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">{t('netmon.log.simplify')}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t('netmon.log.simplifyHint')}</p>
                </div>
                <Switch
                  checked={options.simplify}
                  onCheckedChange={(on) => void patch({ log: { simplify: on } })}
                  aria-label={t('netmon.log.simplify')}
                />
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs" className="gap-1">
                <DownloadIcon aria-hidden />
                {t('netmon.log.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!rows.length} onSelect={exportCsv}>
                <FileSpreadsheetIcon className="size-4" />
                {t('netmon.log.csv')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!rows.length} onSelect={() => void exportPdf()}>
                <FileTextIcon className="size-4" />
                {t('netmon.log.pdf')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportBackup}>
                <FileJsonIcon className="size-4" />
                {t('netmon.log.backup')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                <UploadIcon className="size-4" />
                {t('netmon.log.restore')}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!events.length}
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirmClear(true)}
              >
                <Trash2Icon className="size-4" />
                {t('netmon.log.clear')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </>
      }
    >
      {notice && (
        <p
          role="status"
          className={
            notice.tone === 'ok'
              ? 'mb-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs text-primary'
              : 'mb-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive'
          }
        >
          {notice.text}
        </p>
      )}

      {!rows.length ? (
        <EmptyState icon={ListIcon}>{t('netmon.log.empty')}</EmptyState>
      ) : (
        <>
          <div className="max-h-[28rem] overflow-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 text-left text-[11px] text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-2.5 py-2 font-medium">{t('netmon.log.date')}</th>
                  <th className="px-2.5 py-2 font-medium">{t('netmon.log.status')}</th>
                  <th className="px-2.5 py-2 text-right font-medium">{t('netmon.log.duration')}</th>
                  <th className="hidden px-2.5 py-2 font-medium @[460px]:table-cell">{t('netmon.log.ip')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.slice(0, visible).map((row) => (
                  <tr key={`${row.at}-${row.status}`} className="hover:bg-muted/40">
                    <td className="px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap tabular-nums">
                      {formatDateTime(row.at, options.dateFormat)}
                    </td>
                    <td className="px-2.5 py-1.5">
                      {options.statusFormat === 'system' ? (
                        <code className="text-[11px]">{formatStatus(row.status, 'system')}</code>
                      ) : (
                        <StatusBadge status={row.status} short />
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                      {formatDuration(row.durationMs, options.durationFormat)}
                    </td>
                    <td className="hidden px-2.5 py-1.5 font-mono @[460px]:table-cell">{row.ip ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > visible && (
            <Button variant="ghost" size="xs" className="mt-2 w-full" onClick={() => setVisible((v) => v + PAGE)}>
              {t('netmon.log.more')}
            </Button>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('netmon.log.clearTitle')}
        description={t('netmon.log.clearBody')}
        confirmLabel={t('netmon.log.clear')}
        destructive
        onConfirm={() => void clearNetLog()}
      />
      <ConfirmDialog
        open={pendingRestore !== null}
        onOpenChange={(open) => !open && setPendingRestore(null)}
        title={t('netmon.log.restoreTitle')}
        description={t('netmon.log.restoreBody', { current: events.length, count: pendingRestore?.events.length ?? 0 })}
        confirmLabel={t('netmon.log.restore')}
        onConfirm={() => pendingRestore && void restore(pendingRestore)}
      />
    </Panel>
  )
}

function OptionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      {children}
    </div>
  )
}
