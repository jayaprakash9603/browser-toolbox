import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppWindowIcon,
  CircleStopIcon,
  MonitorIcon,
  PanelTopIcon,
  PauseIcon,
  PlayIcon,
  VideoIcon,
} from 'lucide-react'

import { sendMessage } from '@/core/messaging/messageService'
import type { ExtensionMessage, ExtensionResponse } from '@/core/messaging/types'
import { formatBytes, formatDuration } from '@/core/recorder/format'
import { DEFAULT_RECORDER_SETTINGS, loadRecorderSettings, saveRecorderSettings } from '@/core/recorder/settings'
import type { RecorderQuality, RecorderSession, RecorderSettings, RecordingSource } from '@/core/recorder/types'
import { chooseDesktopSource } from '@/features/recorder/desktopPicker'
import { microphonePermission, useRecorderSession, useRecordings } from '@/features/recorder/useRecorder'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'

import { useCaptureTool } from '../_shared'

const SOURCES: { value: RecordingSource; icon: typeof MonitorIcon; labelKey: string }[] = [
  { value: 'tab', icon: PanelTopIcon, labelKey: 'recorder.source.tab' },
  { value: 'window', icon: AppWindowIcon, labelKey: 'recorder.source.window' },
  { value: 'screen', icon: MonitorIcon, labelKey: 'recorder.source.screen' },
]

const RECENT_LIMIT = 5

type StartResult = { session: RecorderSession } | { needsPicker: true }

async function request<T>(message: ExtensionMessage): Promise<ExtensionResponse<T>> {
  const response = (await chrome.runtime.sendMessage(message)) as ExtensionResponse<T> | undefined
  return response ?? { ok: false, error: 'The extension did not respond. Reload it and try again.' }
}

function openUrl(path: string) {
  void chrome.tabs.create({ url: chrome.runtime.getURL(path) })
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export default function ScreenRecorderTool() {
  const { t } = useTranslation()
  const tool = useCaptureTool('screenshots.recorder')
  useFocusTarget()
  const { session, elapsed } = useRecorderSession()
  const { recordings } = useRecordings()
  const [source, setSource] = useState<RecordingSource>('tab')
  const [settings, setSettings] = useState<RecorderSettings>(DEFAULT_RECORDER_SETTINGS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadRecorderSettings().then(setSettings)
  }, [])

  const patch = (next: Partial<RecorderSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }))
    void saveRecorderSettings(next)
  }

  const start = async () => {
    setError('')
    setBusy(true)
    try {
      if (settings.mic && (await microphonePermission()) !== 'granted') {
        const mic = await request<{ granted: boolean; fallback?: boolean }>({ type: 'RECORDER_REQUEST_MIC' })
        if (!mic.ok || !mic.data.granted) {
          setError(t(mic.ok && mic.data.fallback ? 'recorder.micNeeded' : 'recorder.micBlocked'))
          return
        }
      }
      let response = await request<StartResult>({ type: 'RECORDER_START', source, settings })
      if (response.ok && 'needsPicker' in response.data) {
        const pick = await chooseDesktopSource(source)
        if (!pick) return
        response = await request<StartResult>({
          type: 'RECORDER_START',
          source,
          settings,
          desktopStreamId: pick.streamId,
          desktopAudio: pick.audio && settings.tabAudio,
        })
      }
      if (!response.ok) setError(response.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const paused = session?.phase === 'paused'

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-5">
        {session ? (
          <section className="flex flex-col items-center gap-3 rounded-lg border p-4">
            <p className="flex items-center gap-2 text-2xl font-semibold tabular-nums">
              <span className={`size-3 rounded-full ${paused ? 'bg-amber-500' : 'animate-pulse bg-red-500'}`} />
              {session.phase === 'pending' ? t('recorder.starting') : formatDuration(elapsed)}
            </p>
            <p className="text-xs text-muted-foreground">{t(`recorder.source.${session.source}`)}</p>
            <div className="flex gap-2">
              {session.phase !== 'pending' && (
                <Button
                  variant="outline"
                  onClick={() => void sendMessage({ type: paused ? 'RECORDER_RESUME' : 'RECORDER_PAUSE' })}
                >
                  {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
                  {t(paused ? 'recorder.resume' : 'recorder.pause')}
                </Button>
              )}
              <Button variant="destructive" onClick={() => void sendMessage({ type: 'RECORDER_STOP' })}>
                <CircleStopIcon className="size-4" />
                {t(session.phase === 'pending' ? 'recorder.cancel' : 'recorder.stop')}
              </Button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map(({ value, icon: Icon, labelKey }) => (
                <Button
                  key={value}
                  variant={source === value ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  aria-pressed={source === value}
                  onClick={() => setSource(value)}
                >
                  <Icon className="size-5" />
                  <span className="text-xs">{t(labelKey)}</span>
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <ToggleRow
                id="recorder-mic"
                label={t('recorder.options.mic')}
                checked={settings.mic}
                onChange={(mic) => patch({ mic })}
              />
              <ToggleRow
                id="recorder-audio"
                label={t(source === 'tab' ? 'recorder.options.tabAudio' : 'recorder.options.systemAudio')}
                checked={settings.tabAudio}
                onChange={(tabAudio) => patch({ tabAudio })}
              />
              <ToggleRow
                id="recorder-countdown"
                label={t('recorder.options.countdown')}
                checked={settings.countdown}
                onChange={(countdown) => patch({ countdown })}
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{t('recorder.options.quality')}</span>
                <Segmented<RecorderQuality>
                  size="sm"
                  ariaLabel={t('recorder.options.quality')}
                  value={settings.quality}
                  onValueChange={(quality) => patch({ quality })}
                  options={[
                    { value: '720p', label: '720p' },
                    { value: '1080p', label: '1080p' },
                  ]}
                />
              </div>
            </div>
            <Button className="h-10" disabled={busy} onClick={() => void start()}>
              <VideoIcon className="size-4" />
              {t('recorder.start')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('recorder.hint')}</p>
          </section>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('recorder.recent')}</h3>
            {recordings.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => openUrl('recording.html')}>
                {t('recorder.openLibrary')}
              </Button>
            )}
          </div>
          {recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('recorder.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recordings.slice(0, RECENT_LIMIT).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openUrl(`recording.html?id=${encodeURIComponent(r.id)}`)}
                    className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs hover:bg-muted"
                  >
                    {r.thumbnail ? (
                      <img src={r.thumbnail} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-muted">
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
          )}
        </section>
      </div>
    </ToolPage>
  )
}
