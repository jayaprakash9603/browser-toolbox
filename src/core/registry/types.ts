import type { LucideIcon } from 'lucide-react'

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

export const TOOL_STATUSES = [
  'active',
  'beta',
  'experimental',
  'coming-soon',
  'disabled',
] as const

export type ToolStatus = (typeof TOOL_STATUSES)[number]

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
  permissions?: string[]
  shortcut?: string
  status?: ToolStatus
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
