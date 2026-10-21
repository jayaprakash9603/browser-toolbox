import { useMemo, useState } from 'react'

import type { ScrapeColumn, ScrapeRow } from '@/core/scraper'
import { Input } from '@/shared/components/ui/input'

interface Props {
  rows: ScrapeRow[]
  columns: ScrapeColumn[]
  onColumnsChange: (columns: ScrapeColumn[]) => void
}

export function PreviewTable({ rows, columns, onColumnsChange }: Props) {
  const [filter, setFilter] = useState('')
  const visible = useMemo(
    () => columns.filter((c) => !c.hidden).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [columns],
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows.slice(0, 200)
    return rows.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(q))).slice(0, 200)
  }, [rows, filter])

  const rename = (key: string, label: string) => {
    onColumnsChange(columns.map((c) => (c.key === key ? { ...c, label } : c)))
  }

  const toggleHide = (key: string) => {
    onColumnsChange(columns.map((c) => (c.key === key ? { ...c, hidden: !c.hidden } : c)))
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter rows…"
        className="h-8 text-sm"
      />
      <div className="max-h-64 overflow-auto rounded border text-xs">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {visible.map((col) => (
                <th key={col.key} className="border-b px-2 py-1 text-left font-medium">
                  <input
                    className="mb-0.5 w-full min-w-[4rem] bg-transparent text-xs"
                    value={col.label}
                    onChange={(e) => rename(col.key, e.target.value)}
                  />
                  <button type="button" className="text-[10px] text-muted-foreground" onClick={() => toggleHide(col.key)}>
                    hide
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="odd:bg-muted/30">
                {visible.map((col) => (
                  <td
                    key={col.key}
                    className="max-w-[12rem] truncate border-b px-2 py-1"
                    title={row[col.key]}
                    onClick={() => void navigator.clipboard.writeText(row[col.key] ?? '')}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 200 && (
          <p className="p-2 text-center text-muted-foreground">Showing first 200 of {rows.length} rows</p>
        )}
      </div>
      <details className="text-xs text-muted-foreground">
        <summary>Hidden columns ({columns.filter((c) => c.hidden).length})</summary>
        <ul className="mt-1 space-y-1">
          {columns
            .filter((c) => c.hidden)
            .map((c) => (
              <li key={c.key}>
                <button type="button" className="underline" onClick={() => toggleHide(c.key)}>
                  Show {c.label}
                </button>
              </li>
            ))}
        </ul>
      </details>
    </div>
  )
}
