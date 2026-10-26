import { CONFETTI_COLORS } from './taskStyles'

export interface ConfettiPiece {
  x: number
  y: number
  rotate: number
  color: string
  delay: number
  round: boolean
}

export interface ConfettiBurst {
  id: number
  pieces: ConfettiPiece[]
}

export function makeConfetti(count = 26): ConfettiBurst {
  const pieces = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
    const distance = 48 + Math.random() * 70
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.75,
      rotate: (Math.random() - 0.5) * 540,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.08,
      round: Math.random() > 0.55,
    }
  })
  return { id: Date.now(), pieces }
}

let audio: AudioContext | null = null

/** A soft two-note chime; silent if Web Audio is unavailable. */
export function playCompleteChime(): void {
  try {
    audio ??= new AudioContext()
    const ctx = audio
    if (ctx.state === 'suspended') void ctx.resume()
    const start = ctx.currentTime
    const notes: Array<[number, number]> = [
      [880, 0],
      [1318.5, 0.09],
    ]
    for (const [frequency, offset] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.32)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start + offset)
      osc.stop(start + offset + 0.35)
    }
  } catch {
    /* audio not available */
  }
}
