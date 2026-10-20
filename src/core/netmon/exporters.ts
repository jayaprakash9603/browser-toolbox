import { formatDateTime, formatDuration, formatStatus } from './format'
import type { NetLogRow } from './stats'
import type { NetLogOptions, NetMonitorBackup, NetMonitorSettings, NetEvent } from './types'

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function logToCsv(rows: NetLogRow[], options: NetLogOptions): string {
  const lines = [['Date and time', 'Status', 'Status duration', 'Your IP'].join(',')]
  for (const row of rows) {
    lines.push(
      [
        formatDateTime(row.at, options.dateFormat),
        formatStatus(row.status, options.statusFormat),
        formatDuration(row.durationMs, options.durationFormat),
        row.ip ?? '',
      ]
        .map(csvCell)
        .join(','),
    )
  }
  return lines.join('\n')
}

export function buildBackup(settings: NetMonitorSettings, events: NetEvent[]): NetMonitorBackup {
  return {
    app: 'browser-toolbox.internet-monitor',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    events,
  }
}

const STATUSES = new Set(['online', 'lan', 'offline', 'nodata'])

/** Validates a backup file; throws with a readable message when it isn't one. */
export function parseBackup(text: string): NetMonitorBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const backup = data as Partial<NetMonitorBackup>
  if (backup?.app !== 'browser-toolbox.internet-monitor' || !Array.isArray(backup.events)) {
    throw new Error('This is not an Internet Monitor backup.')
  }
  const events = backup.events.filter(
    (e): e is NetEvent =>
      !!e && typeof e === 'object' && Number.isFinite((e as NetEvent).at) && STATUSES.has((e as NetEvent).status),
  )
  return { ...(backup as NetMonitorBackup), events }
}

export async function logToPdf(
  rows: NetLogRow[],
  options: NetLogOptions,
  summary: { label: string; value: string }[],
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const left = 40
  let y = 50
  doc.setFontSize(16)
  doc.text('Internet connection log', left, y)
  y += 20
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(`Exported ${formatDateTime(Date.now(), options.dateFormat)}`, left, y)
  y += 22
  doc.setTextColor(20)
  doc.setFontSize(10)
  for (const item of summary) {
    doc.text(`${item.label}: ${item.value}`, left, y)
    y += 14
  }
  y += 10
  const cols = [left, 190, 370, 460]
  const header = ['Date and time', 'Status', 'Duration', 'Your IP']
  const drawHeader = () => {
    doc.setFont('helvetica', 'bold')
    header.forEach((h, i) => doc.text(h, cols[i], y))
    doc.setFont('helvetica', 'normal')
    y += 6
    doc.line(left, y, 555, y)
    y += 14
  }
  drawHeader()
  for (const row of rows) {
    if (y > 800) {
      doc.addPage()
      y = 50
      drawHeader()
    }
    const status = doc.splitTextToSize(formatStatus(row.status, options.statusFormat), 170) as string[]
    doc.text(formatDateTime(row.at, options.dateFormat), cols[0], y)
    doc.text(status, cols[1], y)
    doc.text(formatDuration(row.durationMs, options.durationFormat), cols[2], y)
    doc.text(row.ip ?? '', cols[3], y)
    y += 14 * status.length
  }
  return doc.output('blob')
}
