/** Path → full route (path and query) the user opened it from. Lives as long as the panel document. */
const origins = new Map<string, string>()

function pathOf(route: string): string {
  const queryIndex = route.indexOf('?')
  return queryIndex === -1 ? route : route.slice(0, queryIndex)
}

export function recordNavigation(from: string, to: string): void {
  const fromPath = pathOf(from)
  const toPath = pathOf(to)
  if (fromPath === toPath) return
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
