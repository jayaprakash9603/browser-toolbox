export function buildRoute(path: string, params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, value]) => value.length > 0)
  if (entries.length === 0) return path
  const search = new URLSearchParams(entries).toString()
  return `${path}?${search}`
}
