import { useCallback, useEffect, useRef, useState } from 'react'

import { wordAt, type Segment, type WordRange } from './speechText'

export type ReaderStatus = 'idle' | 'playing' | 'paused'

export interface VoiceSettings {
  voice: SpeechSynthesisVoice | undefined
  lang: string
  rate: number
  pitch: number
  volume: number
}

const RESTART_DELAY_MS = 300

export function getSpeechSynthesis(): SpeechSynthesis | undefined {
  if (typeof window === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return undefined
  return window.speechSynthesis ?? undefined
}

export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getSpeechSynthesis()?.getVoices() ?? [])

  useEffect(() => {
    const synth = getSpeechSynthesis()
    if (!synth) return
    const load = () => setVoices(synth.getVoices())
    synth.addEventListener('voiceschanged', load)
    return () => synth.removeEventListener('voiceschanged', load)
  }, [])

  return voices
}

function applySettings(utterance: SpeechSynthesisUtterance, settings: VoiceSettings) {
  if (settings.voice) {
    utterance.voice = settings.voice
    utterance.lang = settings.voice.lang
  } else if (settings.lang) {
    utterance.lang = settings.lang
  }
  utterance.rate = settings.rate
  utterance.pitch = settings.pitch
  utterance.volume = settings.volume
}

/**
 * Speaks segments one utterance at a time. Every start/stop bumps the run token so late
 * `end`/`error` events from a cancelled utterance can't advance playback.
 */
export function useSpeechReader(segments: Segment[], settings: VoiceSettings) {
  const [status, setStatus] = useState<ReaderStatus>('idle')
  const [position, setPosition] = useState(0)
  const [word, setWord] = useState<WordRange | null>(null)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackedSegments, setTrackedSegments] = useState(segments)

  const session = useRef({ run: 0, utterance: null as SpeechSynthesisUtterance | null })
  const latest = useRef({ segments, settings, status, position })

  if (trackedSegments !== segments) {
    setTrackedSegments(segments)
    setStatus('idle')
    setPosition(0)
    setWord(null)
    setFinished(false)
  }

  useEffect(() => {
    latest.current = { segments, settings, status, position }
  })

  useEffect(() => {
    const current = session.current
    current.run += 1
    current.utterance = null
    getSpeechSynthesis()?.cancel()
  }, [segments])

  useEffect(() => {
    const current = session.current
    return () => {
      current.run += 1
      current.utterance = null
      getSpeechSynthesis()?.cancel()
    }
  }, [])

  const speakFrom = useCallback(function speak(index: number) {
    const synth = getSpeechSynthesis()
    if (!synth) return
    const current = session.current
    const run = ++current.run
    const list = latest.current.segments
    synth.cancel()

    if (index >= list.length) {
      current.utterance = null
      setStatus('idle')
      setPosition(0)
      setWord(null)
      setFinished(list.length > 0)
      return
    }

    const segment = list[Math.max(0, index)]
    const utterance = new SpeechSynthesisUtterance(segment.text)
    applySettings(utterance, latest.current.settings)
    utterance.onboundary = (event) => {
      if (run !== current.run || event.name !== 'word') return
      setWord(wordAt(segment.text, event.charIndex, event.charLength))
    }
    utterance.onend = () => {
      if (run === current.run) speak(segment.index + 1)
    }
    utterance.onerror = (event) => {
      if (run !== current.run || event.error === 'interrupted' || event.error === 'canceled') return
      current.run += 1
      current.utterance = null
      setStatus('paused')
      setWord(null)
      setError(event.error)
    }

    current.utterance = utterance
    setPosition(segment.index)
    setWord(null)
    setStatus('playing')
    setFinished(false)
    setError(null)
    synth.speak(utterance)
    if (synth.paused) synth.resume()
  }, [])

  const halt = useCallback((next: ReaderStatus) => {
    const current = session.current
    current.run += 1
    current.utterance = null
    getSpeechSynthesis()?.cancel()
    setWord(null)
    setStatus(next)
  }, [])

  const settingsKey = [settings.voice?.voiceURI ?? '', settings.lang, settings.rate, settings.pitch, settings.volume].join('|')

  useEffect(() => {
    if (latest.current.status !== 'playing') return
    const timer = window.setTimeout(() => {
      if (latest.current.status === 'playing') speakFrom(latest.current.position)
    }, RESTART_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [settingsKey, speakFrom])

  const total = segments.length
  const clampIndex = (index: number) => Math.min(Math.max(index, 0), Math.max(total - 1, 0))

  const play = () => {
    if (total === 0) return
    speakFrom(finished ? 0 : clampIndex(position))
  }
  const pause = () => halt('paused')
  const stop = () => {
    halt('idle')
    setPosition(0)
    setFinished(false)
  }
  const toggle = () => (status === 'playing' ? pause() : play())
  const playFrom = (index: number) => {
    if (total > 0) speakFrom(clampIndex(index))
  }
  const seek = (index: number) => {
    if (total === 0) return
    const target = clampIndex(index)
    setFinished(false)
    if (status === 'playing') {
      speakFrom(target)
      return
    }
    setPosition(target)
    setWord(null)
    if (status === 'idle') setStatus('paused')
  }

  const preview = (text: string, previewSettings: VoiceSettings) => {
    const synth = getSpeechSynthesis()
    if (!synth) return
    halt(status === 'playing' ? 'paused' : status)
    const utterance = new SpeechSynthesisUtterance(text)
    applySettings(utterance, previewSettings)
    session.current.utterance = utterance
    synth.speak(utterance)
  }

  return {
    supported: getSpeechSynthesis() !== undefined,
    status,
    position: clampIndex(position),
    word,
    finished,
    error,
    play,
    pause,
    stop,
    toggle,
    playFrom,
    seek,
    next: () => seek(position + 1),
    previous: () => seek(position - 1),
    preview,
    dismissError: () => setError(null),
  }
}
