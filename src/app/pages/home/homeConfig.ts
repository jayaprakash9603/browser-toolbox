import {
  ClipboardListIcon,
  CodeXmlIcon,
  GlobeIcon,
  ImageIcon,
  ShieldCheckIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'
import { toolRegistry } from '@/core/registry'

export type HomeTagline = {
  id: 'text' | 'developer' | 'web' | 'media' | 'security' | 'productivity'
  icon: LucideIcon
}

/** Rotating welcome messages; copy lives under `home.tagline.<id>` and `home.taglineTopic.<id>`. */
export const HOME_TAGLINES: readonly HomeTagline[] = [
  { id: 'text', icon: TypeIcon },
  { id: 'developer', icon: CodeXmlIcon },
  { id: 'web', icon: GlobeIcon },
  { id: 'media', icon: ImageIcon },
  { id: 'security', icon: ShieldCheckIcon },
  { id: 'productivity', icon: ClipboardListIcon },
]

export const TAGLINE_INTERVAL_MS = 4500

export const QUICK_ACTION_IDS = [
  'clipboard.manager',
  'productivity.snippets',
  'developer.json-toolkit',
  'calculators.calculator',
] as const

export const POPULAR_TOOL_IDS = [
  'clipboard.manager',
  'text.formatter',
  'text.analyzer',
  'text.case-converter',
  'text.find-replace',
  'text.diff',
  'developer.json-toolkit',
  'security.encoder-decoder',
  'design.color-picker',
  'screenshots.capture',
  'generators.qr-toolkit',
  'security.password-generator',
] as const

export function resolveHomeTools(ids: readonly string[]): ToolDefinition[] {
  return ids
    .map((id) => toolRegistry.get(id))
    .filter((tool): tool is ToolDefinition => Boolean(tool))
}

export function getQuickActionTools() {
  return resolveHomeTools(QUICK_ACTION_IDS)
}

export function getPopularTools() {
  return resolveHomeTools(POPULAR_TOOL_IDS)
}

/** Popular tools minus the ones already pinned as quick actions, so the home page never repeats a tool. */
export function getHomePopularTools() {
  const hidden = new Set<string>(QUICK_ACTION_IDS)
  return getPopularTools().filter((tool) => !hidden.has(tool.id))
}

export const TILE_VARS = ['var(--tile-1)', 'var(--tile-2)', 'var(--tile-3)', 'var(--tile-4)'] as const

export function tileColor(index: number) {
  return TILE_VARS[index % TILE_VARS.length]
}

export type GreetingKey = 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening'

export function getGreetingKey(hour = new Date().getHours()): GreetingKey {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning'
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}
