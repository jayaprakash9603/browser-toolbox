import type { ToolDefinition } from './types'
import type { ToolkitGroupId } from './toolkitGroups'
import { TOOLKIT_GROUP_IDS, TOOLKIT_GROUP_LABEL_KEYS } from './toolkitGroups'

export interface ToolkitGroupSection {
  id: ToolkitGroupId
  labelKey: string
  tools: ToolDefinition[]
}

export function groupToolsByToolkit(tools: ToolDefinition[]): ToolkitGroupSection[] {
  const buckets = new Map<ToolkitGroupId, ToolDefinition[]>()
  for (const id of TOOLKIT_GROUP_IDS) buckets.set(id, [])

  for (const tool of tools) {
    const group = tool.toolkitGroup
    if (!group || !buckets.has(group)) continue
    buckets.get(group)!.push(tool)
  }

  return TOOLKIT_GROUP_IDS
    .map((id) => ({
      id,
      labelKey: TOOLKIT_GROUP_LABEL_KEYS[id],
      tools: buckets.get(id) ?? [],
    }))
    .filter((section) => section.tools.length > 0)
}
