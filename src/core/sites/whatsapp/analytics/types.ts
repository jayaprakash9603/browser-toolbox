export type AnalyticsRangePreset = '7d' | '30d' | '90d' | '1y' | 'all'

export type AnalyticsRange =
  | AnalyticsRangePreset
  | { from: string; to: string }

export type RawMessage = {
  chatId: string
  chatName: string
  isGroup: boolean
  fromMe: boolean
  timestampMs: number
  type: string
  author: string
  authorName: string
  body: string
  hasMedia: boolean
  hasLink: boolean
}

export type RawChat = {
  id: string
  name: string
  isGroup: boolean
  unreadCount: number
}

export type RawDataset = {
  messages: RawMessage[]
  chats: RawChat[]
  contactCount: number
  blockedCount: number
  labelCount: number
  optional: {
    channels: number | null
    statusPosts: number | null
    communities: number | null
    calls: number | null
    catalogProducts: number | null
    orders: number | null
  }
}

export type SeriesPoint = { label: string; value: number }
export type DualSeriesPoint = { label: string; sent: number; received: number }

export type ChatPulseReport = {
  meta: {
    messageCount: number
    chatCount: number
    rangeLabel: string
    generatedAt: string
  }
  kpis: Record<string, number>
  dailyActivity: DualSeriesPoint[]
  hourlyActivity: number[]
  weekdayActivity: number[]
  monthlyVolume: SeriesPoint[]
  sentVsReceived: { sent: number; received: number }
  messageTypes: SeriesPoint[]
  topConversations: SeriesPoint[]
  topGroups: SeriesPoint[]
  topDms: SeriesPoint[]
  topGroupSenders: SeriesPoint[]
  longestSilences: SeriesPoint[]
  mostUnread: SeriesPoint[]
  fastestReplies: SeriesPoint[]
  responseTime: {
    medianMin: number
    fastestMin: number
    slowestMin: number
    firstReplyMin: number
    byHour: number[]
  }
  readNotReplied: number
  avgConversationDurationMin: number
  conversationStarters: SeriesPoint[]
  nightReplies: number
  delayedReplies: number
  unanswered: number
  streaks: { current: number; longest: number }
  account: {
    firstMessageAt: string
    lastMessageAt: string
    avgMessageLength: number
    totalWords: number
  }
  topWords: SeriesPoint[]
  topEmojis: SeriesPoint[]
  countries: { country: string; code: string; iso2: string; count: number }[]
  optional: RawDataset['optional']
}
