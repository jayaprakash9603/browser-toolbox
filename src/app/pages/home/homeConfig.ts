import type { ToolDefinition } from '@/core/registry'
import { toolRegistry } from '@/core/registry'

export const QUICK_ACTION_IDS = [
  'clipboard.manager',
  'text.formatter',
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
