export interface VideoCandidate {
  frameId: number
  readyState: number
  playing: boolean
  area: number
}

/** Prefer playing videos, then largest visible area. Skips readyState === 0. */
export function pickBestVideoCandidate(candidates: VideoCandidate[]): VideoCandidate | null {
  const eligible = candidates.filter((c) => c.readyState !== 0 && c.area > 0)
  if (!eligible.length) return null

  return eligible.reduce((best, cand) => {
    if (cand.playing && !best.playing) return cand
    if (!cand.playing && best.playing) return best
    return cand.area > best.area ? cand : best
  })
}
