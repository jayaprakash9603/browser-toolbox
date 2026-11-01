import { toolRegistry } from '@/core/registry'
import { getWorkspaceForTool } from '@/core/registry/workspaces'

/** Path → full route (path and query) the user opened it from. Lives as long as the panel document. */
const origins = new Map<string, string>()

function pathOf(route: string): string {
  const queryIndex = route.indexOf('?')
  return queryIndex === -1 ? route : route.slice(0, queryIndex)
}

function workspaceIdForRoute(route: string): string | undefined {
  const tool = toolRegistry.getAll().find((entry) => entry.route === pathOf(route))
  if (!tool) return undefined
  return getWorkspaceForTool(tool.id)?.id
}

export function recordNavigation(from: string, to: string): void {
  const fromPath = pathOf(from)
  const toPath = pathOf(to)
  if (fromPath === toPath) return
  const fromWorkspace = workspaceIdForRoute(from)
  const toWorkspace = workspaceIdForRoute(to)
  if (fromWorkspace !== undefined && fromWorkspace === toWorkspace) {
    const origin = origins.get(fromPath)
    if (origin !== undefined && !origins.has(toPath)) origins.set(toPath, origin)
    return
  }
  // Heading back to the page that opened `from` must keep that page's own origin, or Back would bounce.
  const fromOrigin = origins.get(fromPath)
  if (fromOrigin !== undefined && pathOf(fromOrigin) === toPath) return
  origins.set(toPath, from)
}

/** Where Back should go from `path`: the page it was opened from, else `fallback`. */
export function getReturnRoute(path: string, fallback: string): string {
  const origin = origins.get(path)
  return origin !== undefined && pathOf(origin) !== path ? origin : fallback
}
