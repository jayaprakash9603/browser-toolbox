import type { LucideIcon } from 'lucide-react'

import type { ToolkitGroupId } from './toolkitGroups'

export const TOOL_CAPABILITIES = [
  'SIDE_PANEL',
  'POPUP',
  'CONTEXT_MENU',
  'CONTENT_SCRIPT',
  'DEVTOOLS',
  'COMMAND',
  'OMNIBOX',
  'CLIPBOARD',
  'PAGE_ACCESS',
  'SCREEN_CAPTURE',
  'STORAGE',
] as const

export type ToolCapability = (typeof TOOL_CAPABILITIES)[number]

export const TOOL_STATUSES = ['active', 'beta', 'experimental', 'coming-soon', 'disabled'] as const

export type ToolStatus = (typeof TOOL_STATUSES)[number]

export const CONTEXT_SURFACES = [
  'SELECTION',
  'LINK',
  'IMAGE',
  'PAGE',
  'ELEMENT',
  'OVERLAY',
] as const

export type ContextSurface = (typeof CONTEXT_SURFACES)[number]

export interface ToolSearchEntry {
  id: string
  labelKey: string
  fallbackLabel: string
  keywords?: string[]
  aliases?: string[]
  params: Record<string, string>
}

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: string
  icon: LucideIcon
  keywords: string[]
  aliases?: string[]
  route: string
  capabilities: ToolCapability[]
  contextSurfaces?: ContextSurface[]
  toolkitGroup?: ToolkitGroupId
  toolkitGroupLabel?: string
  dependencies?: string[]
  version?: string
  permissions?: string[]
  shortcut?: string
  status?: ToolStatus
  searchEntries?: ToolSearchEntry[]
  loader: () => Promise<{ default: React.ComponentType }>
}

export interface CategoryDefinition {
  id: string
  name: string
  description: string
  icon: LucideIcon
  order: number
  enabled: boolean
}
