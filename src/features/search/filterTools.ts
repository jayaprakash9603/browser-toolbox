import type { ToolDefinition } from '@/core/registry'

export function filterTools(
  tools: ToolDefinition[],
  query: string,
  favorites: string[],
  recentIds: string[],
): { favorites: ToolDefinition[]; recent: ToolDefinition[]; results: ToolDefinition[] } {
  const q = query.trim().toLowerCase()
  const results = q
    ? tools.filter((tool) => {
        const haystack = [tool.name, tool.description, tool.category, ...tool.keywords]
          .join(' ')
          .toLowerCase()
        return q.split(/\s+/).every((token) => haystack.includes(token))
      })
    : []

  const favoriteTools = favorites
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is ToolDefinition => Boolean(tool))

  const recentTools = recentIds
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is ToolDefinition => Boolean(tool))

  return { favorites: favoriteTools, recent: recentTools, results }
}

