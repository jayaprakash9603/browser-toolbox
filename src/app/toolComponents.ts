import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const cache = new Map<string, LazyExoticComponent<ComponentType>>()

export function getToolComponent(
  toolId: string,
  loader: () => Promise<{ default: ComponentType }>,
): LazyExoticComponent<ComponentType> {
  let component = cache.get(toolId)
  if (!component) {
    component = lazy(loader)
    cache.set(toolId, component)
  }
  return component
}
