export interface PageCaptureMetrics {
  scrollHeight: number
  viewportWidth: number
  viewportHeight: number
  scrollY: number
  devicePixelRatio: number
}

export interface AreaSelection {
  x: number
  y: number
  width: number
  height: number
  devicePixelRatio: number
}

export function readPageCaptureMetrics(): PageCaptureMetrics {
  const root = document.documentElement
  const body = document.body
  return {
    scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0, root.clientHeight),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollY: window.scrollY,
    devicePixelRatio: window.devicePixelRatio || 1,
  }
}

export function scrollPageTo(y: number): number {
  window.scrollTo(0, y)
  return window.scrollY
}

export function selectPageArea(): Promise<AreaSelection | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-toolbox-capture', 'overlay')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(15,23,42,.28)'
    const box = document.createElement('div')
    box.style.cssText =
      'position:fixed;z-index:2147483647;border:2px solid #f97316;background:rgba(249,115,22,.18);display:none;pointer-events:none'
    const hint = document.createElement('div')
    hint.textContent = 'Drag to capture · Esc to cancel'
    hint.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111827;color:#fff;font:500 13px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:999px'
    document.documentElement.append(overlay, box, hint)

    let start: { x: number; y: number } | null = null

    const cleanup = (value: AreaSelection | null) => {
      overlay.remove()
      box.remove()
      hint.remove()
      window.removeEventListener('keydown', onKey, true)
      resolve(value)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(null)
      }
    }

    overlay.addEventListener('mousedown', (event) => {
      start = { x: event.clientX, y: event.clientY }
      box.style.display = 'block'
      box.style.left = `${start.x}px`
      box.style.top = `${start.y}px`
      box.style.width = '0px'
      box.style.height = '0px'
    })
    overlay.addEventListener('mousemove', (event) => {
      if (!start) return
      const x = Math.min(start.x, event.clientX)
      const y = Math.min(start.y, event.clientY)
      box.style.left = `${x}px`
      box.style.top = `${y}px`
      box.style.width = `${Math.abs(event.clientX - start.x)}px`
      box.style.height = `${Math.abs(event.clientY - start.y)}px`
    })
    overlay.addEventListener('mouseup', (event) => {
      if (!start) return
      const x = Math.min(start.x, event.clientX)
      const y = Math.min(start.y, event.clientY)
      const width = Math.abs(event.clientX - start.x)
      const height = Math.abs(event.clientY - start.y)
      cleanup(
        width < 8 || height < 8
          ? null
          : { x, y, width, height, devicePixelRatio: window.devicePixelRatio || 1 },
      )
    })
    window.addEventListener('keydown', onKey, true)
  })
}

export function fullPageOffsets(totalHeight: number, viewportHeight: number): number[] {
  if (viewportHeight <= 0 || totalHeight <= viewportHeight) return [0]
  const offsets: number[] = []
  let y = 0
  while (y + viewportHeight < totalHeight) {
    offsets.push(y)
    y += viewportHeight
  }
  offsets.push(Math.max(0, totalHeight - viewportHeight))
  return offsets
}
