import type { ToolDefinition } from '@/core/registry'
import { toolRegistry } from '@/core/registry'
import { getToolSearchLabels } from '@/i18n/toolLabels'

export function filterTools(
  tools: ToolDefinition[],
  query: string,
  favorites: string[],
  recentIds: string[],
  localizedLabels: (tool: ToolDefinition) => string[] = getToolSearchLabels,
): { favorites: ToolDefinition[]; recent: ToolDefinition[]; results: ToolDefinition[] } {
  const q = query.trim().toLowerCase()
  const activeTools = tools.filter((tool) => (tool.status ?? 'active') !== 'disabled')
  const results = q ? toolRegistry.search(q) : []

  const favoriteTools = favorites
    .map((id) => activeTools.find((tool) => tool.id === id))
    .filter((tool): tool is ToolDefinition => Boolean(tool))

  const recentTools = recentIds
    .map((id) => activeTools.find((tool) => tool.id === id))
    .filter((tool): tool is ToolDefinition => Boolean(tool))

  if (q && results.length === 0) {
    const tokens = q.split(/\s+/).filter(Boolean)
    const fallback = activeTools.filter((tool) => {
      const haystack = [
        ...localizedLabels(tool),
        tool.category,
        ...tool.keywords,
        ...(tool.aliases ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return tokens.every((token) => haystack.includes(token))
    })
    return { favorites: favoriteTools, recent: recentTools, results: fallback }
  }

  return { favorites: favoriteTools, recent: recentTools, results }
}
