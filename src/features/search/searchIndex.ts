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

function wordsFromId(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
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
    tool.id.replace(/\./g, ' '),
    optionLabel,
    entry.fallbackLabel,
    wordsFromId(entry.id),
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
      if (item.kind === 'option') {
        score += 35
        const label = name.toLowerCase()
        const labelHits = tokens.filter((token) => label.includes(token)).length
        score += labelHits * 20
      }
      if (item.kind === 'setting') score += 30
      return { item, score }
    })
    .filter((row) => row.score > 0)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const kindRank = (kind: SearchItemKind) =>
      kind === 'option' ? 0 : kind === 'setting' ? 1 : 2
    return kindRank(a.item.kind) - kindRank(b.item.kind)
  })
  return scored.map((row) => row.item)
}

export function groupSearchResults(items: SearchItem[]) {
  return {
    options: items.filter((item) => item.kind === 'option'),
    settings: items.filter((item) => item.kind === 'setting'),
    tools: items.filter((item) => item.kind === 'tool'),
  }
}

export function flattenGroupedSearchResults(
  grouped: ReturnType<typeof groupSearchResults>,
  limits = { options: 10, settings: 5, tools: 8 },
): SearchItem[] {
  return [
    ...grouped.options.slice(0, limits.options),
    ...grouped.settings.slice(0, limits.settings),
    ...grouped.tools.slice(0, limits.tools),
  ]
}
