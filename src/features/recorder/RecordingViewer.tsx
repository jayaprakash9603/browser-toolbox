import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, DownloadIcon, Share2Icon, Trash2Icon, VideoIcon } from 'lucide-react'

import { formatBytes, formatDuration, safeFileName } from '@/core/recorder/format'
import { baseMime, extensionForMime } from '@/core/recorder/mime'
import { deleteRecording, getRecordingBlob, notifyRecordingsChanged, renameRecording } from '@/core/recorder/store'
import type { RecordingMeta } from '@/core/recorder/types'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

import { useRecordings } from './useRecorder'

function fileFor(meta: RecordingMeta, blob: Blob): File {
  return new File([blob], `${safeFileName(meta.name)}.${extensionForMime(meta.mimeType)}`, {
    type: baseMime(meta.mimeType),
  })
}

/** MediaRecorder WebM files lack a duration header; seeking far forces Chrome to compute it. */
function fixInfiniteDuration(video: HTMLVideoElement): void {
  if (Number.isFinite(video.duration)) return
  const onUpdate = () => {
    video.removeEventListener('timeupdate', onUpdate)
    video.currentTime = 0
  }
  video.addEventListener('timeupdate', onUpdate)
  video.currentTime = 1e101
}

export function RecordingViewer() {
  const { t } = useTranslation()
  const { recordings } = useRecordings()
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('id'))
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const selected = recordings.find((r) => r.id === selectedId) ?? recordings[0] ?? null

  useEffect(() => {
    if (!selected) return
    let objectUrl = ''
    let cancelled = false
    void getRecordingBlob(selected.id, selected.mimeType).then((b) => {
      if (cancelled) return
      objectUrl = URL.createObjectURL(b)
      setBlob(b)
      setUrl(objectUrl)
      setName(selected.name)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2500)
  }

  const download = () => {
    if (!selected || !blob) return
    const a = document.createElement('a')
    a.href = url
    a.download = fileFor(selected, blob).name
    a.click()
  }

  const copyFrame = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!png) return
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    flash(t('recorder.viewer.frameCopied'))
  }

  const file = selected && blob ? fileFor(selected, blob) : null
  const canShare = Boolean(file && navigator.canShare?.({ files: [file] }))

  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: file.name })
    } catch {
      /* user cancelled */
    }
  }

  const saveName = async () => {
    if (!selected || !name.trim() || name === selected.name) return
    await renameRecording(selected.id, name.trim())
    notifyRecordingsChanged()
  }

  const remove = async () => {
    if (!selected) return
    await deleteRecording(selected.id)
    notifyRecordingsChanged()
    setSelectedId(recordings.find((r) => r.id !== selected.id)?.id ?? null)
    setBlob(null)
    setUrl('')
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-background text-foreground md:flex-row">
      <aside className="w-full shrink-0 border-b p-4 md:w-72 md:border-r md:border-b-0">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <VideoIcon className="size-4" />
          {t('recorder.viewer.library')}
        </h2>
        {recordings.length === 0 && <p className="text-sm text-muted-foreground">{t('recorder.empty')}</p>}
        <ul className="flex flex-col gap-2">
          {recordings.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`flex w-full gap-2 rounded-md border p-2 text-left text-xs hover:bg-muted ${
                  r.id === selected?.id ? 'border-primary bg-muted' : ''
                }`}
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
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        {selected ? (
          <>
            <Input
              value={name}
              aria-label={t('recorder.viewer.name')}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="max-w-xl font-medium"
            />
            {url && (
              <video
                ref={videoRef}
                src={url}
                controls
                className="max-h-[70vh] w-full rounded-lg bg-black"
                onLoadedMetadata={(e) => fixInfiniteDuration(e.currentTarget)}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={download} disabled={!blob}>
                <DownloadIcon className="size-4" />
                {t('recorder.viewer.download', { ext: extensionForMime(selected.mimeType).toUpperCase() })}
              </Button>
              <Button variant="outline" onClick={() => void copyFrame()} disabled={!blob}>
                <CameraIcon className="size-4" />
                {t('recorder.viewer.copyFrame')}
              </Button>
              {canShare && (
                <Button variant="outline" onClick={() => void share()}>
                  <Share2Icon className="size-4" />
                  {t('recorder.viewer.share')}
                </Button>
              )}
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2Icon className="size-4" />
                {t('recorder.viewer.delete')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {formatDuration(selected.durationMs)} · {formatBytes(selected.size)}
                {selected.width ? ` · ${selected.width}×${selected.height}` : ''}
              </span>
              {notice && <span className="text-xs font-medium text-emerald-600">{notice}</span>}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('recorder.empty')}</p>
        )}
      </main>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('recorder.viewer.deleteTitle')}
        description={t('recorder.viewer.deleteBody')}
        confirmLabel={t('recorder.viewer.delete')}
        destructive
        onConfirm={() => void remove()}
      />
    </div>
  )
}
