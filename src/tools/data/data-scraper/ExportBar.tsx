import {
  exportScrapeCsv,
  exportScrapeJson,
  exportScrapeTsv,
  exportScrapeXlsx,
  type ScrapeColumn,
  type ScrapeRow,
} from '@/core/scraper'
import { downloadBlob } from '@/features/netmon/download'
import { Button } from '@/shared/components/ui/button'

interface Props {
  rows: ScrapeRow[]
  columns: ScrapeColumn[]
  hostLabel: string
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ExportBar({ rows, columns, hostLabel }: Props) {
  const base = `${hostLabel || 'scrape'}-${stamp()}`
  const disabled = rows.length === 0

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() =>
          downloadBlob(new Blob([exportScrapeCsv(rows, columns)], { type: 'text/csv;charset=utf-8' }), `${base}.csv`)
        }
      >
        CSV
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          const bytes = exportScrapeXlsx(rows, columns)
          downloadBlob(
            new Blob([new Uint8Array(bytes)], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            `${base}.xlsx`,
          )
        }}
      >
        XLSX
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => void navigator.clipboard.writeText(exportScrapeTsv(rows, columns))}
      >
        Copy TSV
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() =>
          downloadBlob(new Blob([exportScrapeJson(rows, columns)], { type: 'application/json' }), `${base}.json`)
        }
      >
        JSON
      </Button>
    </div>
  )
}
