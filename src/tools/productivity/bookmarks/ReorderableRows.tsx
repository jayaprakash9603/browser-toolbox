import { useMemo, useState, type ReactNode } from 'react'
import { Reorder } from 'motion/react'

import type { BookmarkRow } from './service'

interface ReorderableRowsProps {
  rows: readonly BookmarkRow[]
  renderRow: (row: BookmarkRow, index: number, commit: () => void) => ReactNode
  onCommit: (movedId: string, orderedIds: string[]) => void
}

export function ReorderableRows({ rows, renderRow, onCommit }: ReorderableRowsProps) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows])
  const idKey = ids.join('|')
  const [snapshot, setSnapshot] = useState({ key: idKey, order: ids })
  if (snapshot.key !== idKey) setSnapshot({ key: idKey, order: ids })
  const order = snapshot.key === idKey ? snapshot.order : ids
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={order}
      onReorder={(next) => setSnapshot({ key: idKey, order: next })}
      className="flex select-none flex-col gap-1.5"
    >
      {order.map((id, index) => {
        const row = byId.get(id)
        return row ? renderRow(row, index, () => onCommit(id, order)) : null
      })}
    </Reorder.Group>
  )
}
