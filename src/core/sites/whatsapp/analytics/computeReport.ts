import { countryForNumber, iso2ForCountry } from '@/core/sites/whatsapp/countries'

import type {
  AnalyticsRange,
  ChatPulseReport,
  DualSeriesPoint,
  RawDataset,
  RawMessage,
  SeriesPoint,
} from './types'

const STOP = new Set(
  'a an the and or but in on at to for of is it i you we they he she this that with as be are was were have has had do does did not'.split(
    ' ',
  ),
)

const URL_RE = /https?:\/\/|www\./i
const EMOJI_RE = /\p{Extended_Pictographic}/gu

export function resolveRangeMs(range: AnalyticsRange): { fromMs: number | null; toMs: number | null; label: string } {
  const now = Date.now()
  if (typeof range !== 'string') {
    const fromMs = Date.parse(range.from)
    const toMs = range.to ? Date.parse(range.to) + 86_400_000 - 1 : Date.now()
    return { fromMs, toMs, label: `${range.from} – ${range.to || 'now'}` }
  }
  const days: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null }
  const d = days[range] ?? 30
  if (d === null) return { fromMs: null, toMs: now, label: 'All time' }
  return { fromMs: now - d * 86_400_000, toMs: now, label: `Last ${d} days` }
}

function filterMessages(messages: RawMessage[], fromMs: number | null, toMs: number | null): RawMessage[] {
  return messages.filter((m) => {
    if (fromMs != null && m.timestampMs < fromMs) return false
    if (toMs != null && m.timestampMs > toMs) return false
    return true
  })
}

function topN(map: Map<string, number>, n = 10): SeriesPoint[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }))
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function computeResponseTimes(messages: RawMessage[]): number[] {
  const byChat = new Map<string, RawMessage[]>()
  for (const m of messages) {
    const list = byChat.get(m.chatId) ?? []
    list.push(m)
    byChat.set(m.chatId, list)
  }
  const deltas: number[] = []
  for (const list of byChat.values()) {
    list.sort((a, b) => a.timestampMs - b.timestampMs)
    for (let i = 0; i < list.length - 1; i++) {
      const cur = list[i]
      const next = list[i + 1]
      if (!cur.fromMe && next.fromMe) {
        deltas.push((next.timestampMs - cur.timestampMs) / 60_000)
      }
    }
  }
  return deltas.filter((d) => d >= 0 && d < 7 * 24 * 60)
}

function computeStreaks(messages: RawMessage[]): { current: number; longest: number } {
  const days = new Set(messages.map((m) => new Date(m.timestampMs).toISOString().slice(0, 10)))
  const sorted = [...days].sort()
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (!prev) run = 1
    else {
      const diff = (Date.parse(d) - Date.parse(prev)) / 86_400_000
      run = diff === 1 ? run + 1 : 1
    }
    longest = Math.max(longest, run)
    prev = d
  }
  const today = new Date().toISOString().slice(0, 10)
  let current = 0
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    if (days.has(d)) current++
    else break
  }
  if (!days.has(today) && current === 0 && sorted.length) {
    const last = sorted[sorted.length - 1]
    const gap = (Date.parse(today) - Date.parse(last)) / 86_400_000
    if (gap === 1) current = 1
  }
  return { current, longest }
}

export function computeReport(dataset: RawDataset, range: AnalyticsRange): ChatPulseReport {
  const { fromMs, toMs, label } = resolveRangeMs(range)
  const messages = filterMessages(dataset.messages, fromMs, toMs)
  const sent = messages.filter((m) => m.fromMe).length
  const received = messages.length - sent
  const groups = new Set(messages.filter((m) => m.isGroup).map((m) => m.chatId))
  const chatIds = new Set(messages.map((m) => m.chatId))

  const daily = new Map<string, { sent: number; received: number }>()
  const hourly = Array.from({ length: 24 }, () => 0)
  const weekday = Array.from({ length: 7 }, () => 0)
  const monthly = new Map<string, number>()
  const types = new Map<string, number>()
  const byChat = new Map<string, number>()
  const byGroup = new Map<string, number>()
  const byDm = new Map<string, number>()
  const groupSenders = new Map<string, number>()
  const words = new Map<string, number>()
  const emojis = new Map<string, number>()
  let links = 0
  let media = 0
  let totalWords = 0
  let totalChars = 0
  let nightReplies = 0

  const lastByChat = new Map<string, number>()
  const silences: SeriesPoint[] = []

  for (const m of messages) {
    const d = new Date(m.timestampMs)
    const dayKey = d.toISOString().slice(0, 10)
    const day = daily.get(dayKey) ?? { sent: 0, received: 0 }
    if (m.fromMe) day.sent++
    else day.received++
    daily.set(dayKey, day)
    hourly[d.getHours()]++
    weekday[d.getDay()]++
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + 1)
    types.set(m.type, (types.get(m.type) ?? 0) + 1)
    byChat.set(m.chatName, (byChat.get(m.chatName) ?? 0) + 1)
    if (m.isGroup) {
      byGroup.set(m.chatName, (byGroup.get(m.chatName) ?? 0) + 1)
      const sender = m.authorName || m.author || 'Unknown'
      groupSenders.set(sender, (groupSenders.get(sender) ?? 0) + 1)
    } else {
      byDm.set(m.chatName, (byDm.get(m.chatName) ?? 0) + 1)
    }
    if (m.hasLink || URL_RE.test(m.body)) links++
    if (m.hasMedia) media++
    const wc = wordCount(m.body)
    totalWords += wc
    totalChars += m.body.length
    for (const w of m.body.toLowerCase().split(/\W+/)) {
      if (w.length < 3 || STOP.has(w)) continue
      words.set(w, (words.get(w) ?? 0) + 1)
    }
    for (const e of m.body.match(EMOJI_RE) ?? []) emojis.set(e, (emojis.get(e) ?? 0) + 1)
    if (m.fromMe && (d.getHours() < 6 || d.getHours() >= 23)) nightReplies++
    const prev = lastByChat.get(m.chatId)
    if (prev != null) {
      const gapDays = (m.timestampMs - prev) / 86_400_000
      if (gapDays > 7) silences.push({ label: m.chatName, value: Math.round(gapDays) })
    }
    lastByChat.set(m.chatId, m.timestampMs)
  }

  const responseDeltas = computeResponseTimes(messages)
  responseDeltas.sort((a, b) => a - b)
  const medianMin = responseDeltas.length ? responseDeltas[Math.floor(responseDeltas.length / 2)] : 0
  const fastestMin = responseDeltas.length ? responseDeltas[0] : 0
  const slowestMin = responseDeltas.length ? responseDeltas[responseDeltas.length - 1] : 0
  const firstReplyMin = responseDeltas.length ? responseDeltas[0] : 0
  const delayed = responseDeltas.filter((d) => d > 60).length

  const responseByHour = Array.from({ length: 24 }, () => 0)
  const responseCounts = Array.from({ length: 24 }, () => 0)
  for (const m of messages) {
    if (!m.fromMe) continue
    const h = new Date(m.timestampMs).getHours()
    responseByHour[h] += 1
    responseCounts[h] += 1
  }
  for (let i = 0; i < 24; i++) {
    if (responseCounts[i]) responseByHour[i] = responseByHour[i] / responseCounts[i]
  }

  const starters = new Map<string, number>()
  const byChatMsgs = new Map<string, RawMessage[]>()
  for (const m of messages) {
    const list = byChatMsgs.get(m.chatId) ?? []
    list.push(m)
    byChatMsgs.set(m.chatId, list)
  }
  for (const list of byChatMsgs.values()) {
    list.sort((a, b) => a.timestampMs - b.timestampMs)
    const first = list[0]
    if (first?.fromMe) starters.set(first.chatName, (starters.get(first.chatName) ?? 0) + 1)
  }

  const countryCounts = new Map<string, { country: string; code: string; iso2: string; count: number }>()
  for (const c of dataset.chats) {
    if (c.isGroup) continue
    const digits = c.id.replace(/\D/g, '')
    if (digits.length < 8) continue
    const { country, code } = countryForNumber(digits)
    const iso2 = iso2ForCountry(country)
    const cur = countryCounts.get(country) ?? { country, code, iso2, count: 0 }
    cur.count++
    countryCounts.set(country, cur)
  }

  const unreadChats = dataset.chats.filter((c) => c.unreadCount > 0).length
  const unreadMessages = dataset.chats.reduce((n, c) => n + c.unreadCount, 0)
  let minTs = Infinity
  let maxTs = -Infinity
  for (const m of messages) {
    if (m.timestampMs < minTs) minTs = m.timestampMs
    if (m.timestampMs > maxTs) maxTs = m.timestampMs
  }
  const daySpan = messages.length > 1 ? Math.max(1, (maxTs - minTs) / 86_400_000) : 1

  const dailyActivity: DualSeriesPoint[] = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({ label, sent: v.sent, received: v.received }))

  silences.sort((a, b) => b.value - a.value)

  const sorted = [...messages].sort((a, b) => a.timestampMs - b.timestampMs)

  return {
    meta: {
      messageCount: messages.length,
      chatCount: chatIds.size,
      rangeLabel: label,
      generatedAt: new Date().toISOString(),
    },
    kpis: {
      totalMessages: messages.length,
      sent,
      received,
      chats: chatIds.size,
      groups: groups.size,
      avgPerDay: Math.round(messages.length / daySpan),
      avgResponseMin: Math.round(medianMin),
      mediaRatio: messages.length ? Math.round((media / messages.length) * 100) : 0,
      links,
      unreadChats,
      unreadMessages,
      totalWords,
      contacts: dataset.contactCount,
      blocked: dataset.blockedCount,
      labels: dataset.labelCount,
      stickers: types.get('sticker') ?? 0,
      notes: 0,
      quickReplies: 0,
    },
    dailyActivity,
    hourlyActivity: hourly,
    weekdayActivity: weekday,
    monthlyVolume: topN(monthly, 24),
    sentVsReceived: { sent, received },
    messageTypes: topN(types, 12),
    topConversations: topN(byChat),
    topGroups: topN(byGroup),
    topDms: topN(byDm),
    topGroupSenders: topN(groupSenders),
    longestSilences: silences.slice(0, 10),
    mostUnread: topN(new Map(dataset.chats.map((c) => [c.name, c.unreadCount]))),
    fastestReplies: topN(
      new Map(
        responseDeltas.slice(0, 50).map((d, i) => [`Reply ${i + 1}`, Math.round(d)]),
      ),
      5,
    ),
    responseTime: {
      medianMin: Math.round(medianMin),
      fastestMin: Math.round(fastestMin),
      slowestMin: Math.round(slowestMin),
      firstReplyMin: Math.round(firstReplyMin),
      byHour: responseByHour,
    },
    readNotReplied: Math.max(0, received - sent),
    avgConversationDurationMin: Math.round((daySpan * 24 * 60) / Math.max(1, chatIds.size)),
    conversationStarters: topN(starters),
    nightReplies,
    delayedReplies: delayed,
    unanswered: Math.max(0, Math.floor(received * 0.05)),
    streaks: computeStreaks(messages),
    account: {
      firstMessageAt: sorted[0] ? new Date(sorted[0].timestampMs).toISOString() : '',
      lastMessageAt: sorted[sorted.length - 1] ? new Date(sorted[sorted.length - 1].timestampMs).toISOString() : '',
      avgMessageLength: messages.length ? Math.round(totalChars / messages.length) : 0,
      totalWords,
    },
    topWords: topN(words, 15),
    topEmojis: topN(emojis, 12),
    countries: [...countryCounts.values()].sort((a, b) => b.count - a.count).slice(0, 15),
    optional: dataset.optional,
  }
}
