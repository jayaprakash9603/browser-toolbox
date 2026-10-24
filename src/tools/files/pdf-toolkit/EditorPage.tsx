import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { XIcon } from 'lucide-react'

import { arrowBarbs, ellipseCurves, lineEnds, type LineDirection } from '@/core/engines/pdf/geometry'
import type { PdfDocumentHandle, PdfPageInfo } from '@/core/engines/pdf/pdfjs'
import { PdfPageImage } from '@/shared/components/pdf'
import { cn } from '@/shared/utils/cn'
import { clamp, DRAG_TOOLS, itemLabelKey, type Placed, type PlaceTool } from './placed'
import { CSS_FONTS } from './raster'

/** A box dragged out on the page, as fractions of the displayed page. */
export interface DraggedBox {
  u: number
  v: number
  w: number
  h: number
  direction: LineDirection
}

interface EditorPageProps {
  handle: PdfDocumentHandle
  index: number
  info: PdfPageInfo
  items: Placed[]
  selectedId: string | null
  tool: PlaceTool
  onPlace: (u: number, v: number) => void
  /** A box dragged with a drag tool; falls back to `onPlace` for clicks. */
  onCreate?: (box: DraggedBox) => void
  /** A freehand stroke as x, y pairs of page fractions. */
  onDraw?: (points: number[]) => void
  onSelect: (id: string | null) => void
  onChange: (id: string, patch: Partial<Placed>) => void
  onRemove: (id: string) => void
  /** Called once a drag or resize ends, so the change can be undone as one step. */
  onCommit: () => void
  /** Draws extra marks over the page, such as search matches. */
  overlay?: React.ReactNode
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

type Draft = { kind: 'box'; x0: number; y0: number; x1: number; y1: number } | { kind: 'ink'; points: number[] }

const CURSOR: Record<PlaceTool, string> = {
  select: 'cursor-default',
  signature: 'cursor-copy',
  text: 'cursor-text',
  date: 'cursor-text',
  check: 'cursor-crosshair',
  highlight: 'cursor-crosshair',
  cover: 'cursor-crosshair',
  image: 'cursor-copy',
  box: 'cursor-crosshair',
  ellipse: 'cursor-crosshair',
  line: 'cursor-crosshair',
  arrow: 'cursor-crosshair',
  draw: 'cursor-crosshair',
}

function CheckMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
      <polyline points="14,48 40,78 86,20" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Shapes and ink drawn in pixel space so strokes and arrowheads keep their proportions. */
function VectorMark({ item, scale, boxW, boxH }: { item: Extract<Placed, { kind: 'shape' | 'ink' }>; scale: number; boxW: number; boxH: number }) {
  const stroke = Math.max(0.75, item.width * scale)
  const color = item.kind === 'ink' ? item.color : item.stroke
  let d = ''
  if (item.kind === 'ink') {
    for (let index = 0; index + 1 < item.points.length; index += 2) d += `${index ? 'L' : 'M'}${item.points[index] * boxW} ${item.points[index + 1] * boxH} `
  } else if (item.shape === 'rect') d = `M0 0 H${boxW} V${boxH} H0 Z`
  else if (item.shape === 'ellipse') {
    const { start, curves } = ellipseCurves(boxW, boxH)
    d = `M${start.x} ${start.y} ${curves.map(([a, b, c]) => `C${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`).join(' ')} Z`
  } else {
    const [from, to] = lineEnds(item.direction, boxW, boxH)
    d = `M${from.x} ${from.y} L${to.x} ${to.y}`
    if (item.shape === 'arrow') {
      const [a, b] = arrowBarbs(from, to, Math.max(6, item.width * 4) * scale)
      d += ` M${a.x} ${a.y} L${to.x} ${to.y} L${b.x} ${b.y}`
    }
  }
  const fill = item.kind === 'shape' && item.fill && (item.shape === 'rect' || item.shape === 'ellipse') ? item.fill : 'none'
  return (
    <svg width={Math.max(1, boxW)} height={Math.max(1, boxH)} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      <path d={d} fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** One page with the placed items on top; click to place, drag to move, pull the corner to resize. */
export function EditorPage({ handle, index, info, items, selectedId, tool, onPlace, onCreate, onDraw, onSelect, onChange, onRemove, onCommit, overlay: extra }: EditorPageProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const overlay = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [widthPx, setWidthPx] = useState(600)
  const [draft, setDraft] = useState<Draft | null>(null)

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
  const heightPx = widthPx * (info.height / info.width)

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
      onChange(current.id, { u: clamp(start.u + du, 0, 1 - Math.max(start.w, 0.002)), v: clamp(start.v + dv, 0, 1 - Math.max(start.h, 0.002)) })
    } else {
      const w = clamp(start.w + du, 0.01, 1 - start.u)
      const h = current.keepRatio ? clamp(w * (start.h / start.w), 0.01, 1 - start.v) : clamp(start.h + dv, 0.002, 1 - start.v)
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

  const pointAt = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { u: clamp((event.clientX - rect.left) / rect.width, 0, 1), v: clamp((event.clientY - rect.top) / rect.height, 0, 1) }
  }

  const finishDraft = () => {
    const current = draft
    setDraft(null)
    if (!current) return
    if (current.kind === 'ink') {
      if (current.points.length >= 4) onDraw?.(current.points)
      return
    }
    const w = Math.abs(current.x1 - current.x0)
    const h = Math.abs(current.y1 - current.y0)
    if (w < 0.01 && h < 0.01) {
      onPlace(current.x0, current.y0)
      return
    }
    const right = current.x1 >= current.x0
    const down = current.y1 >= current.y0
    const direction: LineDirection = right ? (down ? 0 : 3) : down ? 1 : 2
    onCreate?.({ u: Math.min(current.x0, current.x1), v: Math.min(current.y0, current.y1), w: Math.max(w, 0.002), h: Math.max(h, 0.002), direction })
  }

  const draftBox = draft?.kind === 'box' ? { left: Math.min(draft.x0, draft.x1), top: Math.min(draft.y0, draft.y1), w: Math.abs(draft.x1 - draft.x0), h: Math.abs(draft.y1 - draft.y0) } : null

  return (
    <div className="relative w-full select-none" style={{ maxWidth: Math.max(info.width * 1.6, 360) }}>
      <PdfPageImage doc={handle} pageNumber={index + 1} width={info.width} height={info.height} eager alt={t('pdf.sign.pageAlt', { page: index + 1 })} />
      <div
        ref={overlay}
        className={cn('absolute inset-0 touch-none outline-none', CURSOR[tool])}
        tabIndex={-1}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const { u, v } = pointAt(event)
          if (tool === 'select') {
            onSelect(null)
            return
          }
          if (tool === 'draw' && onDraw) {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDraft({ kind: 'ink', points: [u, v] })
            return
          }
          if (DRAG_TOOLS.has(tool) && onCreate) {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDraft({ kind: 'box', x0: u, y0: v, x1: u, y1: v })
            return
          }
          onPlace(u, v)
        }}
        onPointerMove={(event) => {
          if (!draft) return
          const { u, v } = pointAt(event)
          if (draft.kind === 'ink') {
            const last = draft.points.length - 2
            if (Math.hypot(u - draft.points[last], v - draft.points[last + 1]) > 0.002) setDraft({ kind: 'ink', points: [...draft.points, u, v] })
          } else setDraft({ ...draft, x1: u, y1: v })
        }}
        onPointerUp={finishDraft}
        onPointerCancel={() => setDraft(null)}
      >
        {extra}
        <AnimatePresence>
          {items.map((item) => {
            const selected = item.id === selectedId
            const box = item.kind !== 'text'
            const label = t(`pdf.sign.itemLabel.${itemLabelKey(item)}`)
            const vector = item.kind === 'shape' || item.kind === 'ink'
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
                  ...(box ? { width: `${item.w * 100}%`, height: `${item.h * 100}%`, minWidth: 6, minHeight: 6 } : {}),
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
                {vector && <VectorMark item={item} scale={scale} boxW={item.w * widthPx} boxH={item.h * heightPx} />}

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

        {draftBox && (
          <div
            className={cn('pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10', tool === 'ellipse' && 'rounded-[50%]')}
            style={{ left: `${draftBox.left * 100}%`, top: `${draftBox.top * 100}%`, width: `${draftBox.w * 100}%`, height: `${draftBox.h * 100}%` }}
            aria-hidden
          />
        )}
        {draft?.kind === 'ink' && (
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${widthPx} ${heightPx}`} aria-hidden>
            <polyline
              points={draft.points.reduce((acc, value, position) => acc + (position % 2 ? `,${value * heightPx} ` : `${value * widthPx}`), '')}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
