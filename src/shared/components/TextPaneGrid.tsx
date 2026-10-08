import { useCallback, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface TextPaneGridProps {
  children: ReactNode
  split?: boolean
  className?: string
}

const MIN_RATIO = 0.2
const MAX_RATIO = 0.8

export function TextPaneGrid({ children, split = true, className }: TextPaneGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(0.5)

  const startDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const bounds = container.getBoundingClientRect()
    const move = (moveEvent: PointerEvent) => {
      const next = (moveEvent.clientX - bounds.left) / bounds.width
      setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)))
    }
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
  }, [])

  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.key === 'ArrowLeft' ? -0.05 : 0.05
    setRatio((current) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, current + step)))
  }

  return (
    <div
      ref={containerRef}
      style={split ? ({ '--pane-a': `${ratio}fr`, '--pane-b': `${1 - ratio}fr` } as React.CSSProperties) : undefined}
      className={cn(
        'grid min-h-[240px] min-w-0 flex-1 grid-cols-1 gap-4 *:min-h-0 *:min-w-0',
        split
          ? 'grid-rows-2 @[600px]:grid-cols-[var(--pane-a)_0px_var(--pane-b)] @[600px]:grid-rows-1 @[600px]:gap-2'
          : 'grid-rows-1',
        className,
      )}
    >
      {split ? <SplitChildren onPointerDown={startDrag} onKeyDown={nudge} ratio={ratio}>{children}</SplitChildren> : children}
    </div>
  )
}

function SplitChildren({
  children,
  ratio,
  onPointerDown,
  onKeyDown,
}: {
  children: ReactNode
  ratio: number
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  if (items.length < 2) return <>{children}</>
  const [first, ...rest] = items
  return (
    <>
      {first}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={MIN_RATIO * 100}
        aria-valuemax={MAX_RATIO * 100}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="group relative hidden cursor-col-resize touch-none outline-none @[600px]:block"
      >
        <span className="absolute inset-y-6 -left-1 w-2 rounded-full transition-colors duration-150 group-hover:bg-primary/25 group-focus-visible:bg-primary/40" />
      </div>
      {rest}
    </>
  )
}
