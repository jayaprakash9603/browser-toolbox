import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { XIcon } from 'lucide-react'

import type { PdfDocumentHandle, PdfPageInfo } from '@/core/engines/pdf/pdfjs'
import { PdfPageImage } from '@/shared/components/pdf'
import { cn } from '@/shared/utils/cn'
import { clamp, type Placed, type PlaceTool } from './placed'
import { CSS_FONTS } from './raster'

interface EditorPageProps {
  handle: PdfDocumentHandle
  index: number
  info: PdfPageInfo
  items: Placed[]
  selectedId: string | null
  tool: PlaceTool
  onPlace: (u: number, v: number) => void
  onSelect: (id: string | null) => void
  onChange: (id: string, patch: Partial<Placed>) => void
  onRemove: (id: string) => void
  /** Called once a drag or resize ends, so the change can be undone as one step. */
  onCommit: () => void
}

type Gesture = {
  id: string
  mode: 'move' | 'resize'
  x: number
  y: number
  rect: DOMRect
  start: { u: number; v: number; w: number; h: number }
  keepRatio: boolean
  moved: boolean
}

const CURSOR: Record<PlaceTool, string> = {
  select: 'cursor-default',
  signature: 'cursor-copy',
  text: 'cursor-text',
  date: 'cursor-text',
  check: 'cursor-crosshair',
  highlight: 'cursor-crosshair',
  cover: 'cursor-crosshair',
  image: 'cursor-copy',
}

function CheckMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
      <polyline points="14,48 40,78 86,20" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** One page with the placed items on top; click to place, drag to move, pull the corner to resize. */
export function EditorPage({ handle, index, info, items, selectedId, tool, onPlace, onSelect, onChange, onRemove, onCommit }: EditorPageProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const overlay = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [widthPx, setWidthPx] = useState(600)

  useEffect(() => {
    const node = overlay.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidthPx(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const scale = widthPx / info.width

  const startGesture = (event: PointerEvent<HTMLElement>, item: Placed, mode: Gesture['mode']) => {
    event.stopPropagation()
    if (event.button !== 0) return
    onSelect(item.id)
    const rect = overlay.current?.getBoundingClientRect()
    if (!rect) return
    const box = item.kind === 'text' ? { w: 0, h: 0 } : { w: item.w, h: item.h }
    gesture.current = {
      id: item.id,
      mode,
      x: event.clientX,
      y: event.clientY,
      rect,
      start: { u: item.u, v: item.v, ...box },
      keepRatio: item.kind === 'image' || item.kind === 'check',
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveGesture = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current
    if (!current) return
    const du = (event.clientX - current.x) / current.rect.width
    const dv = (event.clientY - current.y) / current.rect.height
    if (!current.moved && Math.abs(du) + Math.abs(dv) < 0.002) return
    current.moved = true
    const { start } = current
    if (current.mode === 'move') {
      onChange(current.id, { u: clamp(start.u + du, 0, 1 - Math.max(start.w, 0.02)), v: clamp(start.v + dv, 0, 1 - Math.max(start.h, 0.01)) })
    } else {
      const w = clamp(start.w + du, 0.02, 1 - start.u)
      const h = current.keepRatio ? clamp(w * (start.h / start.w), 0.01, 1 - start.v) : clamp(start.h + dv, 0.01, 1 - start.v)
      onChange(current.id, current.keepRatio ? { w: h * (start.w / start.h), h } : { w, h })
    }
  }

  const endGesture = () => {
    if (gesture.current?.moved) onCommit()
    gesture.current = null
  }

  const onItemKey = (event: KeyboardEvent<HTMLElement>, item: Placed) => {
    const step = event.shiftKey ? 0.02 : 0.004
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (moves[event.key]) {
      event.preventDefault()
      const [du, dv] = moves[event.key]
      const w = item.kind === 'text' ? 0.02 : item.w
      const h = item.kind === 'text' ? 0.01 : item.h
      onChange(item.id, { u: clamp(item.u + du, 0, 1 - w), v: clamp(item.v + dv, 0, 1 - h) })
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onRemove(item.id)
    } else if (event.key === 'Escape') {
      onSelect(null)
      overlay.current?.focus()
    }
  }

  return (
    <div className="relative w-full select-none" style={{ maxWidth: Math.max(info.width * 1.6, 360) }}>
      <PdfPageImage doc={handle} pageNumber={index + 1} width={info.width} height={info.height} eager alt={t('pdf.sign.pageAlt', { page: index + 1 })} />
      <div
        ref={overlay}
        className={cn('absolute inset-0 outline-none', CURSOR[tool])}
        tabIndex={-1}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const rect = event.currentTarget.getBoundingClientRect()
          const u = (event.clientX - rect.left) / rect.width
          const v = (event.clientY - rect.top) / rect.height
          if (tool === 'select') onSelect(null)
          else onPlace(clamp(u, 0, 1), clamp(v, 0, 1))
        }}
      >
        <AnimatePresence>
          {items.map((item) => {
            const selected = item.id === selectedId
            const box = item.kind !== 'text'
            const label = t(`pdf.sign.itemLabel.${item.kind === 'image' && item.signature ? 'signature' : item.kind === 'rect' ? item.variant : item.kind}`)
            return (
              <motion.div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onPointerDown={(event) => startGesture(event, item, 'move')}
                onPointerMove={moveGesture}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
                onFocus={() => onSelect(item.id)}
                onKeyDown={(event) => onItemKey(event, item)}
                className={cn(
                  'group/item absolute cursor-move touch-none rounded-[2px] outline-none',
                  selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-primary/50',
                  item.kind === 'rect' && item.variant === 'cover' && 'shadow-[0_0_0_1px_rgb(15_23_42/0.18)]',
                )}
                style={{
                  left: `${item.u * 100}%`,
                  top: `${item.v * 100}%`,
                  ...(box ? { width: `${item.w * 100}%`, height: `${item.h * 100}%` } : {}),
                }}
              >
                {item.kind === 'text' && (
                  <div
                    className={cn('px-px whitespace-pre', !item.text && 'italic opacity-50')}
                    style={{
                      fontFamily: CSS_FONTS[item.font],
                      fontWeight: item.bold ? 700 : 400,
                      fontSize: item.fontSize * scale,
                      lineHeight: 1.2,
                      color: item.color,
                    }}
                  >
                    {item.text || t('pdf.sign.emptyText')}
                  </div>
                )}
                {item.kind === 'image' && <img src={item.url} alt="" draggable={false} className="pointer-events-none size-full object-fill" />}
                {item.kind === 'rect' && (
                  <div
                    className={cn('size-full', item.variant === 'highlight' && 'mix-blend-multiply')}
                    style={{ backgroundColor: item.color, opacity: item.opacity }}
                  />
                )}
                {item.kind === 'check' && <CheckMark color={item.color} />}

                {selected && (
                  <>
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onRemove(item.id)}
                      aria-label={t('pdf.sign.removeItem', { item: label })}
                      className="absolute -top-3 -right-3 flex size-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-white shadow-md ring-2 ring-white outline-none focus-visible:ring-ring"
                    >
                      <XIcon className="size-3" />
                    </button>
                    {box && (
                      <span
                        aria-hidden
                        onPointerDown={(event) => startGesture(event, item, 'resize')}
                        onPointerMove={moveGesture}
                        onPointerUp={endGesture}
                        onPointerCancel={endGesture}
                        className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-primary shadow-md"
                      />
                    )}
                  </>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
