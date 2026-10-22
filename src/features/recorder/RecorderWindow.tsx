import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleStopIcon, MicIcon, MonitorIcon, PauseIcon, PlayIcon } from 'lucide-react'

import { formatDuration } from '@/core/recorder/format'
import { loadRecorderSettings, videoConstraints } from '@/core/recorder/settings'
import type { RecordingSource } from '@/core/recorder/types'
import { isExtensionMessage } from '@/core/messaging/types'
import { Button } from '@/shared/components/ui/button'

import { startRecording, type ActiveRecording } from './engine'
import { useRecorderSession } from './useRecorder'

type Stage = 'idle' | 'countdown' | 'recording' | 'saving' | 'error'

const COUNTDOWN_SECONDS = 3
const HEARTBEAT_MS = 1000

const SURFACE: Record<RecordingSource, 'browser' | 'window' | 'monitor'> = {
  tab: 'browser',
  window: 'window',
  screen: 'monitor',
}

const TITLE_KEY: Record<RecordingSource, string> = {
  tab: 'recorder.window.tabTitle',
  window: 'recorder.window.windowTitle',
  screen: 'recorder.window.screenTitle',
}

function send(message: Record<string, unknown>): void {
  void chrome.runtime.sendMessage(message).catch(() => undefined)
}

function MicPermission() {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'granted' | 'denied'>('idle')

  const request = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setState('granted')
      window.setTimeout(() => window.close(), 1200)
    } catch {
      setState('denied')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <MicIcon className="size-10 text-primary" />
      <h1 className="text-lg font-semibold">{t('recorder.window.micTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t('recorder.window.micHint')}</p>
      {state === 'granted' ? (
        <p className="text-sm font-medium text-emerald-600">{t('recorder.window.micGranted')}</p>
      ) : (
        <Button onClick={() => void request()}>{t('recorder.window.micAllow')}</Button>
      )}
      {state === 'denied' && <p className="text-sm text-destructive">{t('recorder.window.micDenied')}</p>}
    </div>
  )
}

function DisplayRecorder({ id, source }: { id: string; source: RecordingSource }) {
  const { t } = useTranslation()
  const { session, elapsed } = useRecorderSession()
  const [stage, setStage] = useState<Stage>('idle')
  const [count, setCount] = useState(COUNTDOWN_SECONDS)
  const [error, setError] = useState('')
  const recordingRef = useRef<ActiveRecording | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const finish = async () => {
    const recording = recordingRef.current
    if (!recording) return
    recordingRef.current = null
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    setStage('saving')
    try {
      await recording.stop()
      send({ type: 'RECORDER_FINISHED', id })
    } catch (e) {
      send({ type: 'RECORDER_FINISHED', id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  useEffect(() => {
    const onMessage = (raw: unknown) => {
      if (!isExtensionMessage(raw) || raw.type !== 'RECORDER_CONTROL' || raw.id !== id) return
      const recording = recordingRef.current
      if (!recording) return
      if (raw.action === 'pause') recording.pause()
      else if (raw.action === 'resume') recording.resume()
      else void finish()
    }
    chrome.runtime.onMessage.addListener(onMessage)
    const onUnload = (event: BeforeUnloadEvent) => {
      if (recordingRef.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
      window.removeEventListener('beforeunload', onUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const begin = async () => {
    setError('')
    const settings = await loadRecorderSettings()
    const { width, height } = videoConstraints(settings.quality)
    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: SURFACE[source],
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: 30 },
        },
        audio: settings.tabAudio,
        selfBrowserSurface: 'exclude',
      } as DisplayMediaStreamOptions)
    } catch {
      send({ type: 'RECORDER_STOP' })
      return
    }
    let mic: MediaStream | null = null
    if (settings.mic) {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
    }
    if (settings.countdown) {
      setStage('countdown')
      for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
        setCount(i)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    try {
      recordingRef.current = startRecording({
        id,
        source,
        video: display,
        extraAudio: mic ? [mic] : [],
        onEnded: () => void finish(),
      })
    } catch (e) {
      display.getTracks().forEach((track) => track.stop())
      setError(e instanceof Error ? e.message : String(e))
      setStage('error')
      return
    }
    setStage('recording')
    send({ type: 'RECORDER_STARTED', id })
    heartbeatRef.current = setInterval(() => send({ type: 'RECORDER_HEARTBEAT', id }), HEARTBEAT_MS)
    const win = await chrome.windows.getCurrent().catch(() => null)
    if (win?.id != null) void chrome.windows.update(win.id, { state: 'minimized' }).catch(() => undefined)
  }

  const paused = session?.phase === 'paused'

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <MonitorIcon className="size-10 text-primary" />
      {stage === 'idle' && (
        <>
          <h1 className="text-lg font-semibold">{t(TITLE_KEY[source])}</h1>
          <p className="text-sm text-muted-foreground">
            {t(source === 'tab' ? 'recorder.window.tabHint' : 'recorder.window.pickHint')}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => void begin()}>{t('recorder.window.choose')}</Button>
            <Button variant="outline" onClick={() => send({ type: 'RECORDER_STOP' })}>
              {t('recorder.cancel')}
            </Button>
          </div>
        </>
      )}
      {stage === 'countdown' && <p className="text-6xl font-bold tabular-nums">{count}</p>}
      {stage === 'recording' && (
        <>
          <p className="flex items-center gap-2 text-2xl font-semibold tabular-nums">
            <span className={`size-3 rounded-full ${paused ? 'bg-amber-500' : 'animate-pulse bg-red-500'}`} />
            {formatDuration(elapsed)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => send({ type: paused ? 'RECORDER_RESUME' : 'RECORDER_PAUSE' })}
            >
              {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
              {t(paused ? 'recorder.resume' : 'recorder.pause')}
            </Button>
            <Button variant="destructive" onClick={() => send({ type: 'RECORDER_STOP' })}>
              <CircleStopIcon className="size-4" />
              {t('recorder.stop')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('recorder.window.keepOpen')}</p>
        </>
      )}
      {stage === 'saving' && <p className="text-sm text-muted-foreground">{t('recorder.saving')}</p>}
      {stage === 'error' && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export function RecorderWindow() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('mode') === 'permission') return <MicPermission />
  const id = params.get('id') ?? ''
  const source = (params.get('source') as RecordingSource | null) ?? 'screen'
  return <DisplayRecorder id={id} source={source} />
}
