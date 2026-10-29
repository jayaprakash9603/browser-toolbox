import { scoreMatch } from '@/features/search/scoreMatch'

import type { ToolDefinition } from './types'

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.id)) {
      throw new Error(`Duplicate tool id: ${tool.id}`)
    }
    this.tools.set(tool.id, tool)
  }

  registerAll(tools: ToolDefinition[]) {
    tools.forEach((tool) => this.register(tool))
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id)
  }

  getAll(): ToolDefinition[] {
    return [...this.tools.values()]
  }

  getByCategory(categoryId: string): ToolDefinition[] {
    return this.getAll().filter(
      (tool) =>
        tool.category === categoryId && (tool.status ?? 'active') !== 'disabled',
    )
  }

  search(query: string): ToolDefinition[] {
    const q = query.trim().toLowerCase()
    if (!q) return this.getAll()
    const tokens = q.split(/\s+/).filter(Boolean)
    const scored = this.getAll()
      .map((tool) => ({ tool, score: scoreToolSearch(tool, tokens, q) }))
      .filter((entry) => entry.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((entry) => entry.tool)
  }
}

function scoreToolSearch(
  tool: ToolDefinition,
  tokens: string[],
  fullQuery: string,
): number {
  if ((tool.status ?? 'active') === 'disabled') return 0
  const name = tool.name
  const id = tool.id.toLowerCase()
  const aliases = [...(tool.aliases ?? []), ...tool.keywords]
  const haystack = [
    name.toLowerCase(),
    tool.description.toLowerCase(),
    tool.category,
    tool.id.replace(/\./g, ' '),
    ...tool.keywords.map((keyword) => keyword.toLowerCase()),
    ...(tool.aliases ?? []).map((alias) => alias.toLowerCase()),
  ].join(' ')

  let score = scoreMatch(haystack, name, aliases, tokens, fullQuery)
  if (score > 0 && id.includes(fullQuery.trim().toLowerCase().replace(/\s+/g, '.'))) score += 20
  for (const token of tokens) {
    if (tool.keywords.some((keyword) => keyword.toLowerCase() === token)) score += 15
  }
  return score
}

export const toolRegistry = new ToolRegistry()
