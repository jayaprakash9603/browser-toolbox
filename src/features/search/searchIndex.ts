import type { LucideIcon } from 'lucide-react'
import i18n from 'i18next'

import { toolRegistry } from '@/core/registry'
import type { ToolDefinition, ToolSearchEntry } from '@/core/registry'
import { getWhatsappSearchEntries } from '@/core/sites/whatsapp/searchEntries'
import { getYoutubeSearchEntries } from '@/core/sites/youtube/searchEntries'
import {
  SETTINGS_SEARCH_ENTRIES,
  SETTINGS_SEARCH_ICON,
  settingsSearchRoute,
} from '@/app/pages/settings/settingsSearchEntries'
import { getToolDescription, getToolName } from '@/i18n/toolLabels'
import { buildRoute } from '@/features/search/buildRoute'
import { queryTokens, tokenInText, tokensMatchText } from '@/features/search/searchMatch'
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

/** A search item with every lowercase string it is matched against, built once per index. */
interface IndexedItem {
  item: SearchItem
  haystack: string
  parentHaystack: string
  name: string
  nameLower: string
  aliases: string[]
}

let cachedLang: string | null = null
let cachedIndex: IndexedItem[] | null = null
let cachedItems: SearchItem[] | null = null
let cachedToolCount = -1

export function getSearchEntriesForTool(tool: ToolDefinition): ToolSearchEntry[] {
  if (tool.id === 'sites.youtube') return getYoutubeSearchEntries()
  if (tool.id === 'sites.whatsapp') return getWhatsappSearchEntries()
  return tool.searchEntries ?? []
}

function ensureRegistryReady() {
  if (toolRegistry.getAll().length > 0) return
  void import('@/modules').then(({ registerModules }) => registerModules())
}

function translate(key: string, fallback: string): string {
  return i18n.t(key, { defaultValue: fallback })
}

function toolHaystack(tool: ToolDefinition, t: typeof i18n.t): string {
  const name = getToolName(tool, t)
  const description = getToolDescription(tool, t)
  return [
    name,
    tool.name,
    description,
    tool.description,
    tool.category,
    tool.id.replace(/\./g, ' '),
    wordsFromId(tool.id.split('.').pop() ?? tool.id),
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

function optionDisplayLabel(entry: ToolSearchEntry): string {
  const localized = translate(entry.labelKey, entry.fallbackLabel)
  if (/^(encode|decode)\s/i.test(entry.fallbackLabel)) return entry.fallbackLabel
  if (entry.fallbackLabel.length > localized.length + 2) return entry.fallbackLabel
  return localized
}

function buildOptionItem(
  tool: ToolDefinition,
  entry: ToolSearchEntry,
  t: typeof i18n.t,
): SearchItem {
  const toolName = getToolName(tool, t)
  const optionLabel = optionDisplayLabel(entry)
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

function indexed(item: SearchItem, haystack: string, aliases: string[], parentHaystack = ''): IndexedItem {
  return {
    item,
    haystack,
    parentHaystack,
    name: item.title,
    nameLower: item.title.toLowerCase(),
    aliases,
  }
}

function buildSettingItems(): IndexedItem[] {
  const breadcrumb = translate('settings.title', 'Settings')
  return SETTINGS_SEARCH_ENTRIES.map((entry) => {
    const title = translate(entry.labelKey, entry.fallbackLabel)
    const item: SearchItem = {
      id: `setting:${entry.id}`,
      kind: 'setting',
      title,
      breadcrumb,
      route: settingsSearchRoute(entry.id),
      icon: SETTINGS_SEARCH_ICON,
    }
    const haystack = [title, ...(entry.keywords ?? []), ...(entry.aliases ?? [])].join(' ').toLowerCase()
    return indexed(item, haystack, entry.aliases ?? [])
  })
}

function getSearchIndex(): IndexedItem[] {
  ensureRegistryReady()
  const lang = i18n.language
  const toolCount = toolRegistry.getAll().length
  if (cachedLang === lang && cachedIndex && cachedToolCount === toolCount && toolCount > 0) {
    return cachedIndex
  }

  const t = i18n.t.bind(i18n)
  const index: IndexedItem[] = []

  for (const tool of toolRegistry.getAll()) {
    if ((tool.status ?? 'active') === 'disabled') continue
    const toolText = toolHaystack(tool, t)
    index.push(indexed(buildToolItem(tool, t), toolText, [...(tool.aliases ?? []), ...tool.keywords]))

    for (const entry of getSearchEntriesForTool(tool)) {
      const item = buildOptionItem(tool, entry, t)
      index.push(
        indexed(
          item,
          entryHaystack(tool, entry, item.title, t),
          [...(entry.aliases ?? []), ...(entry.keywords ?? [])],
          toolText,
        ),
      )
    }
  }

  index.push(...buildSettingItems())

  if (toolCount > 0) {
    cachedLang = lang
    cachedIndex = index
    cachedItems = index.map((row) => row.item)
    cachedToolCount = toolCount
  }
  return index
}

export function getAllSearchItems(): SearchItem[] {
  const index = getSearchIndex()
  return cachedIndex === index && cachedItems ? cachedItems : index.map((row) => row.item)
}

/** Builds the index ahead of the first keystroke so typing never pays for it. */
export function warmSearchIndex() {
  getSearchIndex()
}

export function invalidateSearchIndex() {
  cachedLang = null
  cachedIndex = null
  cachedItems = null
  cachedToolCount = -1
}

function optionMatchesTokens(
  haystack: string,
  toolHaystackText: string,
  label: string,
  tokens: string[],
): boolean {
  if (tokensMatchText(haystack, tokens)) return true
  if (tokens.length < 2) return false
  const labelLower = label.toLowerCase()
  const toolHit = tokens.filter((token) => tokenInText(token, toolHaystackText))
  const labelHit = tokens.filter((token) => tokenInText(token, labelLower))
  return toolHit.length > 0 && labelHit.length > 0 && toolHit.length + labelHit.length >= tokens.length
}

export function searchAll(query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const tokens = queryTokens(query)
  const scored: { item: SearchItem; score: number }[] = []

  for (const row of getSearchIndex()) {
    const { item, haystack, name, nameLower: label, aliases } = row
    const allTokensHit = tokensMatchText(haystack, tokens)

    if (item.kind === 'tool') {
      if (!allTokensHit) continue
    } else if (item.kind === 'option') {
      if (!allTokensHit && !optionMatchesTokens(haystack, row.parentHaystack, name, tokens)) continue
    }

    const scoreHaystack = item.kind === 'option' && !allTokensHit ? `${haystack} ${label}` : haystack
    let score = scoreMatch(scoreHaystack, name, aliases, tokens, q)
    if (score <= 0 && item.kind !== 'option') continue
    if (item.kind === 'tool') score += 5
    if (item.kind === 'option') {
      score += 35
      const labelHits = tokens.filter((token) => label.includes(token)).length
      score += labelHits * 20
      if (tokens.length >= 2 && labelHits === tokens.length) score += 50
      if (aliases.some((alias) => alias.toLowerCase() === q)) score += 80
    }
    if (item.kind === 'setting') score += 30
    if (score > 0) scored.push({ item, score })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const kindRank = (kind: SearchItemKind) =>
      kind === 'option' ? 0 : kind === 'setting' ? 1 : 2
    return kindRank(a.item.kind) - kindRank(b.item.kind)
  })
  return scored.map((row) => row.item)
}

/** When sub-options match, hide weak tool rows unless the title or tool keywords fit every token. */
function toolStrongMatch(item: SearchItem, tokens: string[]): boolean {
  if (tokensMatchText(item.title, tokens)) return true
  if (!item.toolId) return false
  const def = toolRegistry.get(item.toolId)
  if (!def) return false
  const haystack = [
    getToolName(def),
    getToolDescription(def),
    def.name,
    def.description,
    def.category,
    def.id.replace(/\./g, ' '),
    ...(def.aliases ?? []),
  ].join(' ')
  if (tokensMatchText(haystack, tokens)) return true
  const keywords = (def.keywords ?? []).join(' ')
  return tokens.some((token) => tokenInText(token, item.title)) && tokensMatchText(keywords, tokens)
}

export function toolsVisibleForQuery(
  tools: SearchItem[],
  optionCount: number,
  query: string,
): SearchItem[] {
  const tokens = queryTokens(query)
  if (optionCount === 0) return tools
  if (tokens.length >= 2) {
    const strong = tools.filter((tool) => toolStrongMatch(tool, tokens))
    return strong.length > 0 ? strong.slice(0, 8) : []
  }
  return tools.slice(0, 6)
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
  limits = { options: 20, settings: 8, tools: 6 },
): SearchItem[] {
  return [
    ...grouped.options.slice(0, limits.options),
    ...grouped.settings.slice(0, limits.settings),
    ...grouped.tools.slice(0, limits.tools),
  ]
}

if (typeof i18n.on === 'function') {
  i18n.on('languageChanged', () => invalidateSearchIndex())
}
