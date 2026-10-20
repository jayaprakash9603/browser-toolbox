import { useCallback, useEffect, useRef, useState } from 'react'

import { STORAGE_KEYS } from '@/core/constants'
import {
  addSpeedResult,
  clearSpeedHistory,
  getSpeedHistory,
  runSpeedTest,
  type SpeedPhase,
  type SpeedServer,
  type SpeedTestResult,
  type SpeedUpdate,
} from '@/core/speedtest'

export interface SpeedSeriesPoint {
  t: number
  download?: number
  upload?: number
}

export interface SpeedTestState {
  phase: SpeedPhase
  liveMbps: number
  progress: number
  pingMs: number | null
  jitterMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  server: SpeedServer | null
  series: SpeedSeriesPoint[]
  error: string | null
}

const INITIAL: SpeedTestState = {
  phase: 'idle',
  liveMbps: 0,
  progress: 0,
  pingMs: null,
  jitterMs: null,
  downloadMbps: null,
  uploadMbps: null,
  server: null,
  series: [],
  error: null,
}

const DOWNLOAD_SECONDS = 10

function reduce(state: SpeedTestState, u: SpeedUpdate): SpeedTestState {
  switch (u.type) {
    case 'phase':
      return { ...state, phase: u.phase, progress: 0, liveMbps: 0 }
    case 'server':
      return { ...state, server: u.server }
    case 'latency':
      return { ...state, pingMs: u.pingMs, jitterMs: u.jitterMs, progress: u.progress }
    case 'throughput': {
      // Upload is plotted after download on one shared time axis.
      const t = Math.round((u.elapsedMs / 1000 + (u.phase === 'upload' ? DOWNLOAD_SECONDS : 0)) * 10) / 10
      return {
        ...state,
        liveMbps: u.mbps,
        progress: u.progress,
        series: [...state.series, { t, [u.phase]: Math.round(u.mbps * 100) / 100 }],
      }
    }
    case 'final':
      return u.phase === 'download' ? { ...state, downloadMbps: u.mbps } : { ...state, uploadMbps: u.mbps }
  }
}

export function useSpeedTest(onComplete?: (result: SpeedTestResult) => void) {
  const [state, setState] = useState<SpeedTestState>(INITIAL)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const start = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ ...INITIAL, phase: 'latency' })
    try {
      const result = await runSpeedTest({
        signal: controller.signal,
        downloadMs: DOWNLOAD_SECONDS * 1000,
        onUpdate: (update) => setState((s) => reduce(s, update)),
      })
      await addSpeedResult(result)
      onComplete?.(result)
    } catch (error) {
      if (controller.signal.aborted) {
        setState((s) => ({ ...s, phase: 'idle', liveMbps: 0, progress: 0 }))
        return
      }
      setState((s) => ({ ...s, phase: 'error', error: error instanceof Error ? error.message : String(error) }))
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [onComplete])

  const cancel = useCallback(() => controllerRef.current?.abort(), [])

  const running = state.phase === 'latency' || state.phase === 'download' || state.phase === 'upload'
  return { state, start, cancel, running }
}

export function useSpeedHistory() {
  const [history, setHistory] = useState<SpeedTestResult[]>([])

  useEffect(() => {
    void getSpeedHistory().then(setHistory)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.speedTestHistory]) {
        setHistory((changes[STORAGE_KEYS.speedTestHistory].newValue as SpeedTestResult[] | undefined) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const clear = useCallback(async () => {
    await clearSpeedHistory()
    setHistory([])
  }, [])

  return { history, clear }
}
