const SECURITY_HEADERS = [
  { header: 'strict-transport-security', label: 'Strict-Transport-Security' },
  { header: 'content-security-policy', label: 'Content-Security-Policy' },
  { header: 'x-frame-options', label: 'X-Frame-Options' },
  { header: 'x-content-type-options', label: 'X-Content-Type-Options' },
  { header: 'referrer-policy', label: 'Referrer-Policy' },
  { header: 'permissions-policy', label: 'Permissions-Policy' },
]

export interface SecurityHeaderRow {
  label: string
  present: boolean
}

export function securityHeaderRows(headers: Record<string, string>): SecurityHeaderRow[] {
  return SECURITY_HEADERS.map(({ header, label }) => ({ label, present: header in headers }))
}

export function hasResponseHeaders(headers: Record<string, string>): boolean {
  return Object.keys(headers).length > 0
}

export function httpVersionLabel(protocol: string | undefined): string | null {
  if (!protocol) return null
  if (protocol === 'h3') return 'HTTP/3'
  if (protocol === 'h2') return 'HTTP/2'
  if (protocol.startsWith('http/')) return protocol.toUpperCase()
  return null
}
