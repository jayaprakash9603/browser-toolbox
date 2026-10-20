import { describe, expect, it } from 'vitest'

import { computeReport, resolveRangeMs, type RawDataset, type RawMessage } from '@/core/sites/whatsapp/analytics'

function msg(partial: Partial<RawMessage> & Pick<RawMessage, 'timestampMs' | 'fromMe'>): RawMessage {
  return {
    chatId: partial.chatId ?? 'c1',
    chatName: partial.chatName ?? 'Alice',
    isGroup: partial.isGroup ?? false,
    fromMe: partial.fromMe,
    timestampMs: partial.timestampMs,
    type: partial.type ?? 'chat',
    author: partial.author ?? '1',
    authorName: partial.authorName ?? 'Alice',
    body: partial.body ?? 'hello world',
    hasMedia: partial.hasMedia ?? false,
    hasLink: partial.hasLink ?? false,
  }
}

function dataset(messages: RawMessage[]): RawDataset {
  return {
    messages,
    chats: [{ id: 'c1', name: 'Alice', isGroup: false, unreadCount: 2 }],
    contactCount: 5,
    blockedCount: 1,
    labelCount: 3,
    optional: {
      channels: null,
      statusPosts: null,
      communities: null,
      calls: null,
      catalogProducts: null,
      orders: null,
    },
  }
}

describe('whatsapp analytics', () => {
  it('resolveRangeMs presets', () => {
    const r = resolveRangeMs('7d')
    expect(r.fromMs).not.toBeNull()
    expect(r.label).toContain('7')
  })

  it('filters by range and counts sent/received', () => {
    const now = Date.now()
    const data = dataset([
      msg({ fromMe: true, timestampMs: now - 86_400_000, body: 'Hi there' }),
      msg({ fromMe: false, timestampMs: now - 86_400_000, body: 'Hey' }),
    ])
    const report = computeReport(data, '30d')
    expect(report.kpis.totalMessages).toBe(2)
    expect(report.sentVsReceived.sent).toBe(1)
    expect(report.sentVsReceived.received).toBe(1)
  })

  it('computes response time between incoming and outgoing', () => {
    const t0 = Date.now() - 10 * 60_000
    const data = dataset([
      msg({ fromMe: false, timestampMs: t0, chatId: 'x', chatName: 'Bob' }),
      msg({ fromMe: true, timestampMs: t0 + 5 * 60_000, chatId: 'x', chatName: 'Bob' }),
    ])
    const report = computeReport(data, 'all')
    expect(report.responseTime.medianMin).toBeGreaterThanOrEqual(4)
  })

  it('tracks word frequency', () => {
    const data = dataset([
      msg({ fromMe: true, timestampMs: Date.now(), body: 'analytics dashboard analytics' }),
    ])
    const report = computeReport(data, 'all')
    expect(report.topWords[0]?.label).toBe('analytics')
  })

  it('maps contact countries from chat ids', () => {
    const data: RawDataset = {
      ...dataset([]),
      chats: [{ id: '441234567890@c.us', name: 'UK', isGroup: false, unreadCount: 0 }],
      messages: [],
    }
    const report = computeReport(data, 'all')
    expect(report.countries.some((c) => c.country.includes('United Kingdom'))).toBe(true)
  })

  it('streak counts active days', () => {
    const day = 86_400_000
    const start = Date.now() - 3 * day
    const data = dataset([
      msg({ fromMe: true, timestampMs: start }),
      msg({ fromMe: true, timestampMs: start + day }),
      msg({ fromMe: true, timestampMs: start + 2 * day }),
    ])
    const report = computeReport(data, 'all')
    expect(report.streaks.longest).toBeGreaterThanOrEqual(3)
  })
})
