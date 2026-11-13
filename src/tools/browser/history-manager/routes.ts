import { HISTORY_TABS, type HistoryManagerTab } from '@/core/history-manager'

export const HISTORY_MANAGER_TABS = HISTORY_TABS

export function isHistoryTab(value: string): value is HistoryManagerTab {
  return (HISTORY_MANAGER_TABS as readonly string[]).includes(value)
}
