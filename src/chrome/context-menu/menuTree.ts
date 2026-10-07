import type { ToolDefinition } from '@/core/registry'

export type MenuSurface = 'selection' | 'link' | 'image' | 'page'
export type MenuContext = 'page' | 'frame' | 'selection' | 'link' | 'image'

export interface MenuItemSpec {
  id: string
  title: string
  contexts: MenuContext[]
  parentId?: string
  toolId?: string
}

const SURFACE_CONTEXTS: Record<MenuSurface, MenuContext[]> = {
  selection: ['selection'],
  link: ['link'],
  image: ['image'],
  page: ['page', 'frame'],
}

const SURFACE_CAPABILITY: Record<MenuSurface, string> = {
  selection: 'CONTEXT_MENU',
  link: 'CONTEXT_MENU',
  image: 'CONTEXT_MENU',
  page: 'CONTEXT_MENU',
}

export const MENU_GROUPS: { id: string; title: string; contexts: MenuSurface[] }[] = [
  { id: 'toolbox.group.text', title: 'Text Tools', contexts: ['selection', 'page'] },
  { id: 'toolbox.group.developer', title: 'Developer Tools', contexts: ['selection', 'page'] },
  { id: 'toolbox.group.qa', title: 'QA Tools', contexts: ['selection', 'page', 'image'] },
  { id: 'toolbox.group.page', title: 'Page Tools', contexts: ['page', 'link', 'image'] },
  { id: 'toolbox.group.color', title: 'Color Tools', contexts: ['image', 'page'] },
]

const CATEGORY_GROUP: Record<string, string> = {
  text: 'toolbox.group.text',
  clipboard: 'toolbox.group.text',
  developer: 'toolbox.group.developer',
  security: 'toolbox.group.developer',
  qa: 'toolbox.group.qa',
  web: 'toolbox.group.page',
  design: 'toolbox.group.color',
}

export function buildMenuItems(tools: ToolDefinition[]): MenuItemSpec[] {
  const items: MenuItemSpec[] = []
  const seen = new Set<string>()

  const push = (item: MenuItemSpec) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }

  push({
    id: 'toolbox.root',
    title: 'Toolbox',
    contexts: ['page', 'selection', 'link', 'image', 'frame'] as MenuContext[],
  })

  for (const surface of ['selection', 'link', 'image', 'page'] as MenuSurface[]) {
    const groups = MENU_GROUPS.filter((group) => group.contexts.includes(surface))
    for (const group of groups) {
      push({
        id: `${group.id}.${surface}`,
        title: group.title,
        contexts: SURFACE_CONTEXTS[surface],
        parentId: 'toolbox.root',
      })
      const candidates = tools.filter(
        (tool) =>
          (tool.status ?? 'active') === 'active' &&
          tool.capabilities.includes(SURFACE_CAPABILITY[surface] as ToolDefinition['capabilities'][number]) &&
          CATEGORY_GROUP[tool.category] === group.id,
      )
      for (const tool of candidates) {
        push({
          id: `toolbox.tool.${tool.id}.${surface}`,
          title: tool.name,
          contexts: SURFACE_CONTEXTS[surface],
          parentId: `${group.id}.${surface}`,
          toolId: tool.id,
        })
      }
    }
    push({
      id: `toolbox.open.${surface}`,
      title: 'Open Side Panel',
      contexts: SURFACE_CONTEXTS[surface],
      parentId: 'toolbox.root',
    })
  }

  return items
}
