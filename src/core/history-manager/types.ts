export const HISTORY_MANAGER_ROUTE = '/tools/browser/history-manager'
export const HISTORY_MANAGER_TOOL_ID = 'browser.history-manager'
export const HISTORY_MANAGER_REVISION_KEY = 'toolbox.historyManagerRevision'

export const HISTORY_TABS = ['overview', 'timeline', 'sites', 'insights', 'closed'] as const
export type HistoryManagerTab = (typeof HISTORY_TABS)[number]

export const RANGE_PRESETS = ['today', '7d', '30d', '90d', 'all'] as const
export type HistoryRangePreset = (typeof RANGE_PRESETS)[number]

export type HistoryVisitActivity = 'all' | 'most' | 'recent' | 'frequent' | 'single'

export type HistoryContentType =
  | 'all'
  | 'webpage'
  | 'image'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'download'

export interface HistoryFilters {
  query: string
  range: HistoryRangePreset
  customStart?: number
  customEnd?: number
  domains: string[]
  visitActivity: HistoryVisitActivity
  contentType: HistoryContentType
}

export interface HistoryPage {
  id: string
  url: string
  title: string
  domain: string
  lastVisitTime: number
  visitCount: number
  typedCount: number
}

export interface HistoryVisit {
  visitId: string
  visitTime: number
  transition?: string
}

export interface HistoryDomainGroup {
  domain: string
  pages: HistoryPage[]
  totalVisits: number
  uniquePages: number
  lastVisitTime: number
  firstVisitTime: number
}

export type TimelineDayKey =
  | 'today'
  | 'yesterday'
  | 'earlierThisWeek'
  | 'lastWeek'
  | 'earlierThisMonth'
  | 'older'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface TimelineSection {
  key: TimelineDayKey
  label: string
  slots: { timeOfDay: TimeOfDay; label: string; pages: HistoryPage[] }[]
}

export interface HistoryStats {
  totalPages: number
  uniqueDomains: number
  todayVisits: number
  yesterdayVisits: number
  weekVisits: number
  topDomain: string | null
  topDomainVisits: number
  peakHour: number | null
  peakHourCount: number
}

export interface HistoryPreferences {
  recentSearches: string[]
  density: 'compact' | 'detailed'
  range: HistoryRangePreset
}
