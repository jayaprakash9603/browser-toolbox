import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

import { DEMOS } from './registry.generated'
import type { WalkStep } from './stage/types'

/** One lazy component per tool, created up front so remounting a reel beat never refetches or resets Suspense. */
export const DEMO_COMPONENTS: Readonly<Record<string, LazyExoticComponent<ComponentType>>> = Object.fromEntries(
  Object.entries(DEMOS).map(([toolId, entry]) => [toolId, lazy(entry.demo)]),
)

export function hasDemo(toolId: string) {
  return toolId in DEMOS
}

/** Starts downloading a tool's demo chunk so the next beat of a reel shows without a loading frame. */
export function prefetchDemo(toolId: string) {
  DEMOS[toolId]?.demo().catch(() => undefined)
}

export function loadDemoSteps(toolId: string): Promise<readonly WalkStep[]> {
  return DEMOS[toolId]?.steps?.() ?? Promise.resolve([])
}
