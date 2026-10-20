export type ChatExportFormat = 'html' | 'json' | 'excel' | 'csv'

export interface ChatExportOptions {
  format: ChatExportFormat
  exportChatName: boolean
  exportParticipantNames: boolean
  exportMedia: boolean
  stableMedia: boolean
  exportUtcTime: boolean
  redactPhoneNumbers: boolean
  onlyMyMessages: boolean
  excludeMyMessages: boolean
  dateFrom: string
  dateTo: string
}

export const DEFAULT_CHAT_EXPORT_OPTIONS: ChatExportOptions = {
  format: 'html',
  exportChatName: true,
  exportParticipantNames: false,
  exportMedia: true,
  stableMedia: false,
  exportUtcTime: false,
  redactPhoneNumbers: true,
  onlyMyMessages: false,
  excludeMyMessages: false,
  dateFrom: '',
  dateTo: '',
}

export type NormalizedChatMessage = {
  id: string
  fromMe: boolean
  timestampMs: number
  body: string
  type: string
  participant: string
  mediaUrl: string
}

export function redactPhones(text: string): string {
  return text.replace(/(\+?\d[\d\s().-]{6,}\d)/g, '[number]')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTime(ts: number, utc: boolean): string {
  const d = new Date(ts)
  return utc ? d.toISOString() : d.toLocaleString()
}

export function normalizeMessages(
  raw: unknown[],
  opts: ChatExportOptions,
  nameFor: (author?: string) => string,
): NormalizedChatMessage[] {
  const fromMs = opts.dateFrom ? Date.parse(opts.dateFrom) : NaN
  const toMs = opts.dateTo ? Date.parse(opts.dateTo) + 86_400_000 - 1 : NaN

  const out: NormalizedChatMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    const row = m as Record<string, unknown>
    const fromMe = Boolean(row.fromMe)
    if (opts.onlyMyMessages && !fromMe) continue
    if (opts.excludeMyMessages && fromMe) continue
    const t = Number(row.t ?? 0)
    const timestampMs = t > 1e12 ? t : t * 1000
    if (!Number.isNaN(fromMs) && timestampMs < fromMs) continue
    if (!Number.isNaN(toMs) && timestampMs > toMs) continue

    let body = String(row.body ?? row.caption ?? '')
    const type = String(row.type ?? 'chat')
    if (!body && type !== 'chat') body = `[${type}]`

    const author = String((row.author as { user?: string } | undefined)?.user ?? row.author ?? '')
    const participant = opts.exportParticipantNames ? nameFor(author) : fromMe ? 'Me' : 'Them'

    let mediaUrl = ''
    if (opts.exportMedia && type !== 'chat') {
      const direct = String(row.directPath ?? row.deprecatedMms3Url ?? row.clientUrl ?? '')
      if (direct) mediaUrl = opts.stableMedia ? direct : direct
    }

    if (opts.redactPhoneNumbers) {
      body = redactPhones(body)
    }

    out.push({
      id: String((row.id as { id?: string } | undefined)?.id ?? row.id ?? `${timestampMs}-${out.length}`),
      fromMe,
      timestampMs,
      body,
      type,
      participant,
      mediaUrl,
    })
  }
  out.sort((a, b) => a.timestampMs - b.timestampMs)
  return out
}

export function buildChatExportFile(
  chatTitle: string,
  messages: NormalizedChatMessage[],
  opts: ChatExportOptions,
): { filename: string; mime: string; content: string } {
  const safe = chatTitle.replace(/[^\w.-]+/g, '_').slice(0, 60) || 'chat'
  const stamp = new Date().toISOString().slice(0, 10)

  if (opts.format === 'json') {
    const payload = {
      ...(opts.exportChatName ? { chat: chatTitle } : {}),
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        ...m,
        time: formatTime(m.timestampMs, opts.exportUtcTime),
      })),
    }
    return {
      filename: `whatsapp-${safe}-${stamp}.json`,
      mime: 'application/json',
      content: JSON.stringify(payload, null, 2),
    }
  }

  const rows = messages.map((m) => ({
    time: formatTime(m.timestampMs, opts.exportUtcTime),
    from: m.participant,
    message: m.body,
    type: m.type,
    media: m.mediaUrl,
  }))

  if (opts.format === 'csv') {
    const header = ['time', 'from', 'message', 'type', 'media']
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        header.map((k) => `"${String(r[k as keyof typeof r] ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ]
    return {
      filename: `whatsapp-${safe}-${stamp}.csv`,
      mime: 'text/csv;charset=utf-8',
      content: `\ufeff${lines.join('\n')}`,
    }
  }

  const title = opts.exportChatName ? `<h1>${escapeHtml(chatTitle)}</h1>` : ''
  const items = rows
    .map((r) => {
      const media = r.media ? `<div><a href="${escapeHtml(r.media)}">media</a></div>` : ''
      return `<div class="msg"><div class="meta">${escapeHtml(r.time)} · ${escapeHtml(r.from)}</div><div class="body">${escapeHtml(r.message)}</div>${media}</div>`
    })
    .join('\n')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(chatTitle)}</title>
<style>body{font:14px system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px}
.msg{margin:12px 0;padding:10px 12px;border-radius:8px;background:#f4f4f5}
.meta{font-size:12px;color:#666;margin-bottom:4px}</style></head><body>${title}${items}</body></html>`

  if (opts.format === 'excel') {
    return {
      filename: `whatsapp-${safe}-${stamp}.xls`,
      mime: 'application/vnd.ms-excel',
      content: html,
    }
  }

  return {
    filename: `whatsapp-${safe}-${stamp}.html`,
    mime: 'text/html;charset=utf-8',
    content: html,
  }
}
