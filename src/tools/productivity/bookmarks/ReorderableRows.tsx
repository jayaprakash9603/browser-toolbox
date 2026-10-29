import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Reorder } from 'motion/react'

import type { BookmarkRow } from './service'

interface ReorderableRowsProps {
  rows: readonly BookmarkRow[]
  renderRow: (row: BookmarkRow, index: number, commit: () => void) => ReactNode
  onCommit: (movedId: string, orderedIds: string[]) => void
}

export function ReorderableRows({ rows, renderRow, onCommit }: ReorderableRowsProps) {
  const idKey = rows.map((row) => row.id).join('|')
  const [order, setOrder] = useState<string[]>(() => rows.map((row) => row.id))
  const latest = useRef(order)
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])

  useEffect(() => {
    const next = idKey ? idKey.split('|') : []
    latest.current = next
    setOrder(next)
  }, [idKey])

  const handleReorder = (next: string[]) => {
    latest.current = next
    setOrder(next)
  }

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={order}
      onReorder={handleReorder}
      className="flex select-none flex-col gap-1.5"
    >
      {order.map((id, index) => {
        const row = byId.get(id)
        return row ? renderRow(row, index, () => onCommit(id, latest.current)) : null
      })}
    </Reorder.Group>
  )
}
