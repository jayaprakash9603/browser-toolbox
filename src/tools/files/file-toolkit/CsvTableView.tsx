import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

const PAGE_SIZE = 200
const NUMERIC = /^-?\d+(?:[.,]\d+)?$/

interface CsvTableViewProps {
  rows: string[][]
}

type SortState = { column: number; direction: 'asc' | 'desc' } | null

function isNumericColumn(body: string[][], column: number): boolean {
  let seen = 0
  for (const row of body) {
    const value = row[column]?.trim()
    if (!value) continue
    if (!NUMERIC.test(value) || (value.length > 1 && value.startsWith('0') && !value.startsWith('0.'))) {
      return false
    }
    seen += 1
    if (seen >= 50) break
  }
  return seen > 0
}

export function CsvTableView({ rows }: CsvTableViewProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [sort, setSort] = useState<SortState>(null)
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const { headers, body, numericColumns, indexed } = useMemo(() => {
    const [headerRow = [], ...dataRows] = rows
    const columnCount = dataRows
      .slice(0, 500)
      .reduce((max, row) => Math.max(max, row.length), headerRow.length)
    const columns = Array.from({ length: columnCount }, (_, index) =>
      headerRow[index]?.trim() ? headerRow[index] : `Column ${index + 1}`,
    )
    return {
      headers: columns,
      body: dataRows,
      numericColumns: columns.map((_, index) => isNumericColumn(dataRows, index)),
      indexed: dataRows.map((cells, index) => ({ cells, line: index + 1 })),
    }
  }, [rows])

  const visible = useMemo(() => {
    const filtered = deferredQuery
      ? indexed.filter(({ cells }) => cells.some((cell) => cell.toLowerCase().includes(deferredQuery)))
      : indexed
    if (!sort) return filtered
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort(
      (a, b) =>
        factor *
        (a.cells[sort.column] ?? '').localeCompare(b.cells[sort.column] ?? '', undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
    )
  }, [indexed, deferredQuery, sort])

  const toggleSort = (column: number) => {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: 'asc' }
      if (current.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
  }

  if (body.length === 0) {
    return <p className="rounded-lg border bg-muted/20 p-4 text-center text-xs text-muted-foreground">{t('files.emptyCsv')}</p>
  }

  const shown = visible.slice(0, limit)
  const remaining = visible.length - shown.length

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE_SIZE)
            }}
            placeholder={t('files.filterRows')}
            aria-label={t('files.filterRows')}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {t('files.matches', { shown: visible.length.toLocaleString(), total: body.length.toLocaleString() })}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          {t('files.noMatches', { query: query.trim() })}
        </p>
      ) : (
        <div className="scrollbar-both max-h-[max(16rem,calc(100dvh-23.5rem))] overflow-auto rounded-[var(--radius-lg)] border bg-card">
          <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 left-0 z-20 border-r border-b bg-muted px-2 py-2 text-right font-medium text-muted-foreground"
                >
                  <span className="sr-only">{t('files.rowNumber')}</span>#
                </th>
                {headers.map((header, index) => {
                  const direction = sort?.column === index ? sort.direction : null
                  const SortIcon = direction === 'asc' ? ArrowUpIcon : direction === 'desc' ? ArrowDownIcon : ArrowUpDownIcon
                  return (
                    <th
                      key={index}
                      scope="col"
                      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
                      className="sticky top-0 z-10 border-b bg-muted p-0 font-semibold text-foreground"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => toggleSort(index)}
                        className={cn(
                          'group h-auto w-full justify-start gap-1 rounded-none px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/60 focus-visible:ring-inset focus-visible:ring-offset-0 active:scale-100',
                          numericColumns[index] && 'justify-end',
                        )}
                      >
                        {header}
                        <SortIcon
                          className={cn(
                            'size-3 shrink-0 transition-opacity',
                            direction ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60',
                          )}
                          aria-hidden
                        />
                      </Button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map(({ cells, line }) => (
                <tr key={line} className="group/row">
                  <td className="sticky left-0 z-[1] border-r border-b bg-card px-2 py-1.5 text-right tabular-nums text-muted-foreground group-hover/row:bg-accent">
                    {line}
                  </td>
                  {headers.map((_, index) => {
                    const value = cells[index] ?? ''
                    return (
                      <td
                        key={index}
                        title={value.length > 32 ? value : undefined}
                        className={cn(
                          'max-w-[32ch] truncate border-b px-3 py-1.5 whitespace-nowrap group-hover/row:bg-accent/60',
                          numericColumns[index] && 'text-right tabular-nums',
                          !value && 'text-muted-foreground/50',
                        )}
                      >
                        {value || '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {remaining > 0 && (
            <div className="sticky left-0 flex justify-center border-t bg-card p-2">
              <Button variant="outline" size="xs" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                {t('files.showMore', { count: Math.min(PAGE_SIZE, remaining) })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
