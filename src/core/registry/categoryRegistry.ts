import type { CategoryDefinition } from './types'

class CategoryRegistry {
  private categories = new Map<string, CategoryDefinition>()

  register(category: CategoryDefinition) {
    if (this.categories.has(category.id)) return
    this.categories.set(category.id, category)
  }

  registerAll(categories: CategoryDefinition[]) {
    categories.forEach((category) => this.register(category))
  }

  get(id: string): CategoryDefinition | undefined {
    return this.categories.get(id)
  }

  getAll(): CategoryDefinition[] {
    return [...this.categories.values()].sort((a, b) => a.order - b.order)
  }

  getEnabled(): CategoryDefinition[] {
    return this.getAll().filter((category) => category.enabled)
  }
}

export const categoryRegistry = new CategoryRegistry()
