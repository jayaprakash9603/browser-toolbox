import { categoryRegistry, toolRegistry } from '@/core/registry'
import { CATEGORIES } from '@/core/registry/categories'
import { clipboardTools } from './clipboard/registry'
import { textTools } from './text/registry'

let initialized = false

export function registerModules() {
  if (initialized) return
  initialized = true
  categoryRegistry.registerAll(CATEGORIES)
  toolRegistry.registerAll(clipboardTools)
  toolRegistry.registerAll(textTools)
}
