import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/shared/utils/cn'

type Cell = string | number | boolean | null

interface DataPreviewTableProps {
  columns: readonly string[]
  rows: readonly Record<string, Cell>[]
  className?: string
}

function CellValue({ value }: { value: Cell }) {
  if (value === null) return <span className="text-muted-foreground/60 italic">NULL</span>
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
        {String(value)}
      </span>
    )
  }
  if (typeof value === 'number') return <span className="text-sky-600 dark:text-sky-400">{value}</span>
  return <>{value}</>
}

/** Readable, scrollable grid with a sticky header and row-number gutter. Scrolls inside its own box. */
export function DataPreviewTable({ columns, rows, className }: DataPreviewTableProps) {
  const reduce = useReducedMotion()
  return (
    <div className={cn('scrollbar-both overflow-auto', className)}>
      <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-20 w-9 border-b bg-muted px-2 py-1.5 text-right font-mono text-[10px] font-medium text-muted-foreground">
              #
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className="sticky top-0 z-10 border-b bg-muted px-3 py-1.5 text-left font-mono text-[11px] font-semibold whitespace-nowrap"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <motion.tr
              key={index}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index, 14) * 0.025 }}
              className="group"
            >
              <td className="sticky left-0 z-[5] border-b bg-background px-2 py-1.5 text-right font-mono text-[10px] text-muted-foreground group-hover:bg-accent">
                {index + 1}
              </td>
              {columns.map((column) => (
                <td
                  key={column}
                  className="max-w-64 truncate border-b px-3 py-1.5 font-mono group-hover:bg-accent"
                  title={row[column] === null ? 'NULL' : String(row[column])}
                >
                  <CellValue value={row[column] ?? null} />
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
