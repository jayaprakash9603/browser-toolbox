export type LinkCheckResult = {
  href: string
  text: string
  status: number | null
  ok: boolean
  error?: string
}

export function isBrokenStatus(status: number | null): boolean {
  if (status == null) return true
  return status >= 400 || status === 0
}

export function summarizeResults(results: LinkCheckResult[]): { total: number; broken: number } {
  const broken = results.filter((r) => !r.ok).length
  return { total: results.length, broken }
}
