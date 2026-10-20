import type { LucideIcon } from 'lucide-react'
import i18n from 'i18next'

import { toolRegistry } from '@/core/registry'
import type { ToolDefinition, ToolSearchEntry } from '@/core/registry'
import { getYoutubeSearchEntries } from '@/core/sites/youtube/searchEntries'
import {
  SETTINGS_SEARCH_ENTRIES,
  SETTINGS_SEARCH_ICON,
  settingsSearchRoute,
} from '@/app/pages/settings/settingsSearchEntries'
import { getToolName } from '@/i18n/toolLabels'
import { buildRoute } from '@/features/search/buildRoute'
import { scoreMatch } from '@/features/search/scoreMatch'

export type SearchItemKind = 'tool' | 'option' | 'setting'

export interface SearchItem {
  id: string
  kind: SearchItemKind
  title: string
  breadcrumb: string
  route: string
  icon: LucideIcon
  toolId?: string
}

let cachedLang: string | null = null
let cachedItems: SearchItem[] | null = null

function translate(key: string, fallback: string): string {
  return i18n.t(key, { defaultValue: fallback })
}

function toolHaystack(tool: ToolDefinition, t: typeof i18n.t): string {
  const name = getToolName(tool, t)
  return [
    name,
    tool.name,
    tool.description,
    tool.category,
    ...tool.keywords,
    ...(tool.aliases ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function entryHaystack(
  tool: ToolDefinition,
  entry: ToolSearchEntry,
  optionLabel: string,
  t: typeof i18n.t,
): string {
  return [
    toolHaystack(tool, t),
    optionLabel,
    entry.fallbackLabel,
    ...(entry.keywords ?? []),
    ...(entry.aliases ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function buildToolItem(tool: ToolDefinition, t: typeof i18n.t): SearchItem {
  const title = getToolName(tool, t)
  return {
    id: tool.id,
    kind: 'tool',
    title,
    breadcrumb: title,
    route: tool.route,
    icon: tool.icon,
    toolId: tool.id,
  }
}

function buildOptionItem(
  tool: ToolDefinition,
  entry: ToolSearchEntry,
  t: typeof i18n.t,
): SearchItem {
  const toolName = getToolName(tool, t)
  const optionLabel = translate(entry.labelKey, entry.fallbackLabel)
  return {
    id: `${tool.id}:${entry.id}`,
    kind: 'option',
    title: optionLabel,
    breadcrumb: `${toolName} › ${optionLabel}`,
    route: buildRoute(tool.route, entry.params),
    icon: tool.icon,
    toolId: tool.id,
  }
}

function buildSettingItems(): SearchItem[] {
  return SETTINGS_SEARCH_ENTRIES.map((entry) => {
    const title = translate(entry.labelKey, entry.fallbackLabel)
    return {
      id: `setting:${entry.id}`,
      kind: 'setting',
      title,
      breadcrumb: translate('settings.title', 'Settings'),
      route: settingsSearchRoute(entry.id),
      icon: SETTINGS_SEARCH_ICON,
    }
  })
}

export function getAllSearchItems(): SearchItem[] {
  const lang = i18n.language
  if (cachedLang === lang && cachedItems) return cachedItems

  const t = i18n.t.bind(i18n)
  const items: SearchItem[] = []

  for (const tool of toolRegistry.getAll()) {
    if ((tool.status ?? 'active') === 'disabled') continue
    items.push(buildToolItem(tool, t))

    const entries =
      tool.id === 'sites.youtube' ? getYoutubeSearchEntries() : (tool.searchEntries ?? [])

    for (const entry of entries) {
      items.push(buildOptionItem(tool, entry, t))
    }
  }

  items.push(...buildSettingItems())

  cachedLang = lang
  cachedItems = items
  return items
}

export function invalidateSearchIndex() {
  cachedLang = null
  cachedItems = null
}

export function searchAll(query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const tokens = q.split(/\s+/).filter(Boolean)
  const t = i18n.t.bind(i18n)

  const scored = getAllSearchItems()
    .map((item) => {
      let haystack = ''
      let name = item.title
      let aliases: string[] = []

      if (item.kind === 'tool') {
        const tool = toolRegistry.get(item.toolId!)
        if (!tool) return { item, score: 0 }
        haystack = toolHaystack(tool, t)
        name = item.title
        aliases = [...(tool.aliases ?? []), ...tool.keywords]
      } else if (item.kind === 'option' && item.toolId) {
        const tool = toolRegistry.get(item.toolId)
        if (!tool) return { item, score: 0 }
        const entryId = item.id.split(':').slice(1).join(':')
        const entry =
          tool.id === 'sites.youtube'
            ? getYoutubeSearchEntries().find((e) => e.id === entryId)
            : tool.searchEntries?.find((e) => e.id === entryId)
        if (!entry) return { item, score: 0 }
        const optionLabel = translate(entry.labelKey, entry.fallbackLabel)
        haystack = entryHaystack(tool, entry, optionLabel, t)
        name = optionLabel
        aliases = [...(entry.aliases ?? []), ...(entry.keywords ?? [])]
      } else if (item.kind === 'setting') {
        const entry = SETTINGS_SEARCH_ENTRIES.find((e) => item.id === `setting:${e.id}`)
        if (!entry) return { item, score: 0 }
        name = translate(entry.labelKey, entry.fallbackLabel)
        haystack = [name, ...(entry.keywords ?? []), ...(entry.aliases ?? [])].join(' ').toLowerCase()
        aliases = entry.aliases ?? []
      }

      let score = scoreMatch(haystack, name, aliases, tokens, q)
      if (item.kind === 'tool') score += 5
      if (item.kind === 'option') score += 25
      return { item, score }
    })
    .filter((row) => row.score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored.map((row) => row.item)
}
