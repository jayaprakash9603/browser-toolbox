import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckSquareIcon,
  DownloadIcon,
  LoaderCircleIcon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from 'lucide-react'

import { formatBytes, formatDuration } from '@/core/recorder/format'
import { recordingsToZip, recordingsZipFilename } from '@/core/recorder/export'
import { deleteRecordings, notifyRecordingsChanged } from '@/core/recorder/store'
import type { RecordingMeta } from '@/core/recorder/types'
import { downloadBlobInExtension } from '@/core/screenshot/export'
import { downloadBlob } from '@/features/netmon/download'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/utils/cn'

import { groupRecordingsByDay, type RecordingDayGroup } from './recordingGroups'

const GROUP_LABEL: Record<RecordingDayGroup, string> = {
  today: 'recorder.viewer.groupToday',
  yesterday: 'recorder.viewer.groupYesterday',
  older: 'recorder.viewer.groupOlder',
}

interface RecordingLibraryAsideProps {
  recordings: RecordingMeta[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAfterDelete: (removedIds: string[]) => void
}

export function RecordingLibraryAside({ recordings, selectedId, onSelect, onAfterDelete }: RecordingLibraryAsideProps) {
  const { t } = useTranslation()
  const [selectMode, setSelectMode] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [zipping, setZipping] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [quickDeleteId, setQuickDeleteId] = useState<string | null>(null)

  const groups = useMemo(() => groupRecordingsByDay(recordings), [recordings])
  const pickedCount = picked.size

  const togglePicked = (id: string) => {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setAllPicked = (on: boolean) => {
    setPicked(on ? new Set(recordings.map((r) => r.id)) : new Set())
  }

  const leaveSelectMode = () => {
    setSelectMode(false)
    setPicked(new Set())
  }

  const targets = useMemo(() => {
    const ids = selectMode && pickedCount > 0 ? [...picked] : recordings.map((r) => r.id)
    return recordings.filter((r) => ids.includes(r.id))
  }, [recordings, selectMode, picked, pickedCount])

  const downloadZip = async () => {
    if (!targets.length) return
    setZipping(true)
    try {
      const zip = await recordingsToZip(targets)
      const filename = recordingsZipFilename()
      if (typeof chrome?.downloads?.download === 'function') {
        await downloadBlobInExtension(zip, filename)
      } else {
        downloadBlob(zip, filename)
      }
    } finally {
      setZipping(false)
    }
  }

  const removeIds = async (ids: string[]) => {
    if (!ids.length) return
    await deleteRecordings(ids)
    notifyRecordingsChanged()
    onAfterDelete(ids)
    leaveSelectMode()
    setConfirmBulkDelete(false)
    setQuickDeleteId(null)
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b md:w-80 md:border-r md:border-b-0">
      <div className="flex flex-col gap-2 border-b p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <VideoIcon className="size-4" />
          {t('recorder.viewer.library')}
        </h2>
        {recordings.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {!selectMode ? (
              <>
                <Button variant="outline" size="xs" onClick={() => setSelectMode(true)}>
                  <CheckSquareIcon className="size-3.5" aria-hidden />
                  {t('recorder.viewer.select')}
                </Button>
                <Button variant="outline" size="xs" disabled={zipping} onClick={() => void downloadZip()}>
                  {zipping ? <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden /> : <DownloadIcon className="size-3.5" aria-hidden />}
                  {t('recorder.viewer.downloadAllZip')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="xs" onClick={() => setAllPicked(true)}>
                  {t('recorder.viewer.selectAll')}
                </Button>
                <Button variant="outline" size="xs" onClick={() => setAllPicked(false)} disabled={!pickedCount}>
                  {t('recorder.viewer.selectNone')}
                </Button>
                <Button variant="outline" size="xs" disabled={!pickedCount || zipping} onClick={() => void downloadZip()}>
                  {zipping ? <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden /> : <DownloadIcon className="size-3.5" aria-hidden />}
                  {t('recorder.viewer.downloadZip', { count: pickedCount })}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="text-destructive"
                  disabled={!pickedCount}
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                  {t('recorder.viewer.deleteSelected', { count: pickedCount })}
                </Button>
                <Button variant="ghost" size="xs" onClick={leaveSelectMode}>
                  <XIcon className="size-3.5" aria-hidden />
                  {t('recorder.viewer.doneSelecting')}
                </Button>
              </>
            )}
          </div>
        )}
        {selectMode && pickedCount > 0 && (
          <p className="text-[11px] text-muted-foreground">{t('recorder.viewer.selectedCount', { count: pickedCount })}</p>
        )}
      </div>

      <div className="scrollbar-styled max-h-[50vh] flex-1 overflow-y-auto p-4 md:max-h-none">
        {recordings.length === 0 && <p className="text-sm text-muted-foreground">{t('recorder.empty')}</p>}
        {groups.map(({ group, items }) => (
          <section key={group} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {t(GROUP_LABEL[group])}
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((r) => {
                const checked = picked.has(r.id)
                const active = r.id === selectedId
                return (
                  <li key={r.id}>
                    <div
                      className={cn(
                        'flex w-full gap-2 rounded-md border p-2 text-left text-xs transition-colors',
                        active && !selectMode ? 'border-primary bg-muted' : 'hover:bg-muted/70',
                      )}
                    >
                      {selectMode && (
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePicked(r.id)}
                          aria-label={t('recorder.viewer.selectItem', { name: r.name })}
                          className="mt-1 shrink-0"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => (selectMode ? togglePicked(r.id) : onSelect(r.id))}
                        className="flex min-w-0 flex-1 cursor-pointer gap-2 border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {r.thumbnail ? (
                          <img src={r.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-muted">
                            <VideoIcon className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="text-muted-foreground">
                            {formatDuration(r.durationMs)} · {formatBytes(r.size)}
                          </span>
                        </span>
                      </button>
                      {!selectMode && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={t('recorder.viewer.delete')}
                          onClick={(event) => {
                            event.stopPropagation()
                            setQuickDeleteId(r.id)
                          }}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={t('recorder.viewer.deleteSelectedTitle')}
        description={t('recorder.viewer.deleteSelectedBody', { count: pickedCount })}
        confirmLabel={t('recorder.viewer.delete')}
        destructive
        onConfirm={() => void removeIds([...picked])}
      />
      <ConfirmDialog
        open={quickDeleteId !== null}
        onOpenChange={(open) => !open && setQuickDeleteId(null)}
        title={t('recorder.viewer.deleteTitle')}
        description={t('recorder.viewer.deleteBody')}
        confirmLabel={t('recorder.viewer.delete')}
        destructive
        onConfirm={() => void removeIds(quickDeleteId ? [quickDeleteId] : [])}
      />
    </aside>
  )
}