/** A reel is a tall video sitting in a black stage, not a small feed thumbnail. */
export function isOpenReel(
  box: { left: number; width: number; height: number },
  viewport: { width: number; height: number },
): boolean {
  return box.width >= 120 && box.height >= viewport.height * 0.55 && box.left > 64 && box.left < viewport.width - 80
}

/** How far left the reel group should move so it sits against the window edge. */
export function reelShift(left: number): number {
  return Math.max(0, Math.round(left - 12))
}

const SHIFT_ATTR = 'data-tbx-ig-shift'

function findGroup(video: HTMLVideoElement): HTMLElement {
  const videoBox = video.getBoundingClientRect()
  let node = video.parentElement
  let best: HTMLElement = video
  for (let depth = 0; depth < 8 && node && node !== document.body; depth += 1) {
    const box = node.getBoundingClientRect()
    const extra = box.width - videoBox.width
    const sharesEdge = Math.abs(box.left - videoBox.left) < 32
    if (extra >= 0 && extra < 340 && sharesEdge && box.height >= videoBox.height * 0.8) best = node
    if (box.width > window.innerWidth * 0.85) break
    node = node.parentElement
  }
  return best
}

/** Slide an open reel to the leading edge. Instagram centers it, so a side panel leaves a dead black gutter. */
export function pinReelStage(): void {
  const viewport = { width: window.innerWidth, height: window.innerHeight }
  document.querySelectorAll('video').forEach((video) => {
    const box = video.getBoundingClientRect()
    if (!isOpenReel(box, viewport)) return
    // Native controls can force a wide element with black side bars. Fill those.
    if (video.controls && box.width > box.height * 0.75) {
      video.style.setProperty('object-fit', 'cover', 'important')
    }
    const group = findGroup(video)
    const parent = group.parentElement
    if (parent) {
      const display = getComputedStyle(parent).display
      if (display.includes('flex')) parent.style.setProperty('justify-content', 'flex-start', 'important')
    }
    const left = video.getBoundingClientRect().left
    if (left <= 64) return
    if (getComputedStyle(group).transform !== 'none') return
    group.style.setProperty('transform', `translateX(-${reelShift(left)}px)`, 'important')
    group.setAttribute(SHIFT_ATTR, '1')
  })
}

let started = false
let pending = 0

export function startReelStage(): void {
  if (started) return
  started = true
  const schedule = () => {
    if (pending) return
    pending = window.setTimeout(() => {
      pending = 0
      pinReelStage()
    }, 80)
  }
  window.addEventListener('resize', schedule)
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  schedule()
}
