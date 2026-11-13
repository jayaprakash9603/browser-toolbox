import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface HistoryVirtualListProps {
  count: number
  estimateSize?: number
  children: (index: number) => ReactNode
  className?: string
}

export function HistoryVirtualList({ count, estimateSize = 56, children, className }: HistoryVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
  })
  if (count < 80) {
    return (
      <ul className={className}>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="list-none">
            {children(i)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div ref={parentRef} className={className} style={{ contain: 'strict' }}>
      <ul style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <li
            key={item.key}
            className="list-none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            {children(item.index)}
          </li>
        ))}
      </ul>
    </div>
  )
}
