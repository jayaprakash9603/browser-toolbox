import { TOOL_SEARCH_ENTRIES } from '@/features/search/allToolSearchEntries'

import type { ToolDefinition } from './types'
import type { ToolkitGroupId } from './toolkitGroups'
import { TOOLKIT_GROUP_LABEL_KEYS } from './toolkitGroups'

const DEFAULT_TOOLKIT_BY_CATEGORY: Record<string, ToolkitGroupId> = {
  clipboard: 'clipboard-text',
  text: 'clipboard-text',
  developer: 'developer',
  qa: 'qa',
  api: 'api',
  web: 'web',
  data: 'data',
  design: 'design',
  security: 'security',
  privacy: 'privacy',
  sites: 'sites',
  calculators: 'calculators',
  datetime: 'datetime',
  screenshots: 'screenshots',
  image: 'image',
  files: 'files',
  generators: 'generators',
  seo: 'seo',
  productivity: 'productivity',
  browser: 'browser',
  storage: 'storage',
  accessibility: 'accessibility',
}

type DefineToolInput = Omit<ToolDefinition, 'toolkitGroupLabel' | 'version'> & {
  toolkitGroup?: ToolkitGroupId
}

export function defineTool(tool: DefineToolInput): ToolDefinition {
  const toolkitGroup = tool.toolkitGroup ?? DEFAULT_TOOLKIT_BY_CATEGORY[tool.category]
  if (!toolkitGroup) {
    throw new Error(`Missing toolkitGroup for tool ${tool.id} (category ${tool.category})`)
  }
  return {
    version: '1',
    toolkitGroup,
    toolkitGroupLabel: TOOLKIT_GROUP_LABEL_KEYS[toolkitGroup],
    ...tool,
    searchEntries: tool.searchEntries ?? TOOL_SEARCH_ENTRIES[tool.id],
  }
}
