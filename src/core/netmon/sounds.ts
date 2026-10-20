import type { NetSoundId } from './types'

type Tone = { freq: number; to?: number; at: number; dur: number; type?: OscillatorType }

const SOUNDS: Record<Exclude<NetSoundId, 'none'>, Tone[]> = {
  chime: [
    { freq: 880, at: 0, dur: 0.18 },
    { freq: 1318.5, at: 0.14, dur: 0.32 },
  ],
  rise: [{ freq: 420, to: 980, at: 0, dur: 0.35 }],
  beep: [{ freq: 1000, at: 0, dur: 0.16, type: 'square' }],
  pop: [{ freq: 640, to: 320, at: 0, dur: 0.12 }],
  alert: [
    { freq: 720, at: 0, dur: 0.14, type: 'square' },
    { freq: 720, at: 0.22, dur: 0.14, type: 'square' },
  ],
  fall: [{ freq: 900, to: 300, at: 0, dur: 0.4 }],
}

let ctx: AudioContext | null = null

/** Synthesized with WebAudio so no audio assets need to ship with the extension. */
export async function playNetSound(sound: NetSoundId, volume: number): Promise<void> {
  if (sound === 'none' || volume <= 0) return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
  const start = ctx.currentTime + 0.02
  const peak = Math.min(1, Math.max(0, volume)) * 0.35
  for (const tone of SOUNDS[sound]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tone.type ?? 'sine'
    const t0 = start + tone.at
    osc.frequency.setValueAtTime(tone.freq, t0)
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.dur)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + tone.dur + 0.05)
  }
}
