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

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: string
  icon: LucideIcon
  keywords: string[]
  route: string
  capabilities: ToolCapability[]
  permissions?: string[]
  shortcut?: string
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
