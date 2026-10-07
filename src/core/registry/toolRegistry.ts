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
  const name = tool.name.toLowerCase()
  const id = tool.id.toLowerCase()
  const aliases = (tool.aliases ?? []).map((alias) => alias.toLowerCase())
  const haystack = [
    name,
    tool.description.toLowerCase(),
    tool.category,
    ...tool.keywords.map((keyword) => keyword.toLowerCase()),
    ...aliases,
  ].join(' ')

  if (!tokens.every((token) => haystack.includes(token))) return 0

  let score = 10
  if (name === fullQuery || aliases.includes(fullQuery)) score += 100
  if (name.startsWith(fullQuery) || aliases.some((alias) => alias.startsWith(fullQuery))) score += 40
  if (id.includes(fullQuery.replace(/\s+/g, '.'))) score += 20
  for (const token of tokens) {
    if (name === token) score += 30
    if (aliases.includes(token)) score += 25
    if (tool.keywords.some((keyword) => keyword.toLowerCase() === token)) score += 15
  }
  return score
}

export const toolRegistry = new ToolRegistry()
