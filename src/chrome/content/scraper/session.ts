const LAYER_ID = 'toolbox-scraper-highlights'

let layer: HTMLDivElement | null = null

function ensureLayer(): HTMLDivElement {
  if (layer) return layer
  layer = document.createElement('div')
  layer.id = LAYER_ID
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483645',
    pointerEvents: 'none',
  })
  document.documentElement.appendChild(layer)
  return layer
}

export function clearHighlights(): void {
  layer?.remove()
  layer = null
}

export function highlightRows(rowSelector: string, containerSelector?: string): number {
  clearHighlights()
  const root = ensureLayer()
  let count = 0
  try {
    if (containerSelector) {
      const container = document.querySelector(containerSelector)
      if (container) {
        const r = container.getBoundingClientRect()
        const box = document.createElement('div')
        Object.assign(box.style, {
          position: 'fixed',
          top: `${r.top}px`,
          left: `${r.left}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          border: '2px dashed #22c55e',
          borderRadius: '4px',
          boxSizing: 'border-box',
        })
        root.appendChild(box)
      }
    }
    document.querySelectorAll(rowSelector).forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      const box = document.createElement('div')
      Object.assign(box.style, {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '1px solid rgba(34, 197, 94, 0.85)',
        background: 'rgba(34, 197, 94, 0.08)',
        boxSizing: 'border-box',
      })
      root.appendChild(box)
      count += 1
    })
  } catch {
    return 0
  }
  return count
}
