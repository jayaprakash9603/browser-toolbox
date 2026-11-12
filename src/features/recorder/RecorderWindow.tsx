import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MicIcon } from 'lucide-react'

import { isExtensionMessage } from '@/core/messaging/types'
import { loadRecorderSettings, videoConstraints } from '@/core/recorder/settings'
import type { RecorderQuality, RecordingSource } from '@/core/recorder/types'
import { Button } from '@/shared/components/ui/button'

import { chooseDesktopSource } from './desktopPicker'
import { startRecording, type ActiveRecording } from './engine'

function reportMic(granted: boolean): void {
  void chrome.runtime.sendMessage({ type: 'RECORDER_MIC_RESULT', granted }).catch(() => undefined)
}

async function askMicrophone(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch {
    return false
  }
}

/** Runs inside an invisible frame on the current page; Chrome shows its standard prompt. */
function EmbeddedMicPermission() {
  useEffect(() => {
    void askMicrophone().then(reportMic)
  }, [])
  return null
}

/** Fallback window for pages where a frame cannot be injected (chrome:// pages, the Web Store). */
function MicPermission() {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'granted' | 'denied'>('idle')

  const request = async () => {
    const granted = await askMicrophone()
    reportMic(granted)
    setState(granted ? 'granted' : 'denied')
    if (granted) window.setTimeout(() => window.close(), 1200)
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

const COUNTDOWN_SECONDS = 3
const HEARTBEAT_MS = 1000

type Stage = 'picking' | 'recording' | 'saving' | 'error'

function send(message: Record<string, unknown>): void {
  void chrome.runtime.sendMessage(message).catch(() => undefined)
}

async function captureDesktop(streamId: string, withAudio: boolean, quality: RecorderQuality) {
  const { width, height } = videoConstraints(quality)
  const mandatory = { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId }
  return navigator.mediaDevices.getUserMedia({
    audio: withAudio ? ({ mandatory } as MediaTrackConstraints) : false,
    video: { mandatory: { ...mandatory, maxWidth: width, maxHeight: height, maxFrameRate: 30 } } as MediaTrackConstraints,
  })
}

/** Pinned recorder tab: opens Chrome's share picker on load and owns the recording. */
function PageRecorder({ id, source, returnTabId }: { id: string; source: RecordingSource; returnTabId?: number }) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('picking')
  const [error, setError] = useState('')
  const recordingRef = useRef<ActiveRecording | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const launchedRef = useRef(false)

  const finish = useCallback(async () => {
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
  }, [id])

  useEffect(() => {
    const onMessage = (raw: unknown) => {
      if (!isExtensionMessage(raw) || raw.type !== 'RECORDER_CONTROL' || raw.id !== id) return
      const recording = recordingRef.current
      if (!recording) return
      if (raw.action === 'pause') recording.pause()
      else if (raw.action === 'resume') recording.resume()
      else void finish()
    }
    const onUnload = (event: BeforeUnloadEvent) => {
      if (recordingRef.current) event.preventDefault()
    }
    chrome.runtime.onMessage.addListener(onMessage)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [id, finish])

  useEffect(() => {
    if (launchedRef.current) return
    launchedRef.current = true
    const run = async () => {
      const settings = await loadRecorderSettings()
      const pick = await chooseDesktopSource(source)
      if (!pick) {
        send({ type: 'RECORDER_STOP' })
        return
      }
      let video: MediaStream
      try {
        video = await captureDesktop(pick.streamId, pick.audio && settings.tabAudio, settings.quality)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setStage('error')
        send({ type: 'RECORDER_STOP' })
        return
      }
      const mic = settings.mic
        ? await navigator.mediaDevices
            .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
            .catch(() => null)
        : null
      if (returnTabId != null) {
        await chrome.tabs.update(returnTabId, { active: true }).catch(() => undefined)
      }
      if (settings.countdown) await new Promise((resolve) => setTimeout(resolve, COUNTDOWN_SECONDS * 1000 + 150))
      recordingRef.current = startRecording({
        id,
        source,
        video,
        extraAudio: mic ? [mic] : [],
        onEnded: () => void finish(),
      })
      setStage('recording')
      send({ type: 'RECORDER_STARTED', id })
      heartbeatRef.current = setInterval(() => send({ type: 'RECORDER_HEARTBEAT', id }), HEARTBEAT_MS)
    }
    void run()
  }, [id, source, returnTabId, finish])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#555]">
      <p className="sr-only">
        {stage === 'picking' && t('recorder.page.picking')}
        {stage === 'recording' && t('recorder.page.backgroundHint')}
        {stage === 'saving' && t('recorder.saving')}
        {stage === 'error' && error}
      </p>
      {stage === 'error' && (
        <p className="px-4 py-3 text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function RecorderWindow() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('embed') === '1') return <EmbeddedMicPermission />
  if (params.get('mode') === 'record') {
    const returnTab = Number(params.get('returnTab'))
    return (
      <PageRecorder
        id={params.get('id') ?? ''}
        source={(params.get('source') as RecordingSource | null) ?? 'screen'}
        returnTabId={Number.isInteger(returnTab) && returnTab > 0 ? returnTab : undefined}
      />
    )
  }
  return <MicPermission />
}
