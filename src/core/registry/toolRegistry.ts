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
    return this.getAll().filter((tool) => tool.category === categoryId)
  }

  search(query: string): ToolDefinition[] {
    const q = query.trim().toLowerCase()
    if (!q) return this.getAll()
    return this.getAll().filter((tool) => {
      const haystack = [
        tool.name,
        tool.description,
        tool.category,
        ...tool.keywords,
        ...(tool.aliases ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return q.split(/\s+/).every((token) => haystack.includes(token))
    })
  }
}

export const toolRegistry = new ToolRegistry()
