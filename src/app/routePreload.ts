import { LEGACY_TOOL_ROUTES } from '@/app/legacyToolRoutes'
import { toolRegistry } from '@/core/registry'

function pathFromHash(): string {
  const hash = window.location.hash.replace(/^#/, '')
  const queryIndex = hash.indexOf('?')
  const path = queryIndex === -1 ? hash : hash.slice(0, queryIndex)
  return path.startsWith('/') ? path : '/'
}

/** Start downloading the route chunk that matches the current hash before React paints. */
export function preloadRouteFromHash(): void {
  const path = pathFromHash()
  if (path === '/' || path === '') {
    void import('@/app/pages/HomePage')
    return
  }
  if (path === '/settings') {
    void import('@/app/pages/SettingsPage')
    return
  }
  if (path === '/favorites' || path === '/recent') {
    void import('@/app/pages/HomePage')
    return
  }
  if (path === '/devtools') {
    void import('@/app/pages/DevToolsPage')
    return
  }
  const legacyToolId = LEGACY_TOOL_ROUTES[path]
  if (legacyToolId) {
    const tool = toolRegistry.get(legacyToolId)
    if (tool) void tool.loader()
    return
  }
  const categoryMatch = path.match(/^\/categories\/([\w-]+)$/)
  if (categoryMatch) {
    void import('@/app/pages/CategoryPage')
    return
  }
  const tool = toolRegistry.getAll().find((entry) => entry.route === path)
  if (tool) void tool.loader()
  else void import('@/app/pages/HomePage')
}
