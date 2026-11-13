import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { cn } from '@/shared/utils/cn'

export type StudioAnnotateTool = 'arrow' | 'rect' | 'circle' | 'pen' | 'highlight' | 'text' | 'marker' | 'blur'

export type StudioAnnotation =
  | {
      id: string
      tool: Exclude<StudioAnnotateTool, 'pen' | 'text'>
      color: string
      x1: number
      y1: number
      x2: number
      y2: number
      number?: number
    }
  | { id: string; tool: 'pen'; color: string; points: { x: number; y: number }[] }
  | { id: string; tool: 'text'; color: string; x1: number; y1: number; x2: number; y2: number; text: string }

const COLORS: Record<StudioAnnotateTool, string> = {
  arrow: '#38bdf8',
  rect: '#a78bfa',
  circle: '#34d399',
  pen: '#f8fafc',
  highlight: '#facc15',
  text: '#f8fafc',
  marker: '#fb7185',
  blur: '#94a3b8',
}

export function AnnotationLayer({
  tool,
  annotations,
  onChange,
}: {
  tool: StudioAnnotateTool | null
  annotations: StudioAnnotation[]
  onChange: (next: StudioAnnotation[]) => void
}) {
  const [draft, setDraft] = useState<StudioAnnotation | null>(null)
  const marker = useRef(1)
  const start = useRef<{ x: number; y: number } | null>(null)

  const local = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tool) return
    event.preventDefault()
    const point = local(event)
    start.current = point
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'pen') {
      setDraft({ id: crypto.randomUUID(), tool: 'pen', color: COLORS.pen, points: [point] })
      return
    }
    if (tool === 'text') {
      const text = window.prompt('Text') ?? ''
      if (text) {
        onChange([
          ...annotations,
          { id: crypto.randomUUID(), tool: 'text', color: COLORS.text, x1: point.x, y1: point.y, x2: point.x, y2: point.y, text },
        ])
      }
      return
    }
    if (tool === 'marker') {
      onChange([
        ...annotations,
        {
          id: crypto.randomUUID(),
          tool: 'marker',
          color: COLORS.marker,
          x1: point.x,
          y1: point.y,
          x2: point.x,
          y2: point.y,
          number: marker.current++,
        },
      ])
      return
    }
    setDraft({
      id: crypto.randomUUID(),
      tool,
      color: COLORS[tool],
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
    })
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draft) return
    const point = local(event)
    if (draft.tool === 'pen') {
      setDraft({ ...draft, points: [...draft.points, point] })
      return
    }
    setDraft({ ...draft, x2: point.x, y2: point.y })
  }

  const onPointerUp = () => {
    if (draft) onChange([...annotations, draft])
    setDraft(null)
    start.current = null
  }

  const items = draft ? [...annotations, draft] : annotations

  return (
    <div
      className={cn('absolute inset-0 z-30', tool ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg className="size-full">
        {items.map((note) => (
          <AnnotationShape key={note.id} note={note} />
        ))}
      </svg>
    </div>
  )
}

function AnnotationShape({ note }: { note: StudioAnnotation }) {
  if (note.tool === 'pen') {
    const d = note.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
    return <path d={d} fill="none" stroke={note.color} strokeWidth={2.4} strokeLinecap="round" />
  }
  if (note.tool === 'text') {
    return (
      <text x={note.x1} y={note.y1} fill={note.color} fontSize="14" fontFamily="ui-sans-serif, system-ui">
        {note.text}
      </text>
    )
  }
  const x = Math.min(note.x1, note.x2)
  const y = Math.min(note.y1, note.y2)
  const w = Math.abs(note.x2 - note.x1)
  const h = Math.abs(note.y2 - note.y1)
  if (note.tool === 'rect' || note.tool === 'highlight' || note.tool === 'blur') {
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={note.tool === 'rect' ? 'none' : note.tool === 'highlight' ? `${note.color}55` : '#0008'}
        stroke={note.color}
        strokeWidth={note.tool === 'rect' ? 2 : 0}
        rx={note.tool === 'blur' ? 8 : 2}
      />
    )
  }
  if (note.tool === 'circle') {
    return (
      <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={note.color} strokeWidth={2} />
    )
  }
  if (note.tool === 'arrow') {
    return (
      <line x1={note.x1} y1={note.y1} x2={note.x2} y2={note.y2} stroke={note.color} strokeWidth={2.4} markerEnd="url(#arrow)" />
    )
  }
  return (
    <g>
      <circle cx={note.x1} cy={note.y1} r={11} fill={note.color} />
      <text x={note.x1} y={note.y1 + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight={700}>
        {note.number}
      </text>
    </g>
  )
}
