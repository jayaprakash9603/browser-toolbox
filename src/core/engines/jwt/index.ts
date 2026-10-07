export interface JwtClaims {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [claim: string]: unknown
}

export type JwtStatus = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry'

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: JwtClaims
  signature: string
  status: JwtStatus
  warnings: string[]
  parts: { header: string; payload: string; signature: string }
}

export type JwtResult = { ok: true; value: DecodedJwt } | { ok: false; error: string }

function decodeSegment(segment: string): Record<string, unknown> | string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
  } catch {
    return 'Segment is not valid Base64URL-encoded JSON.'
  }
}

export function decodeJwt(token: string): JwtResult {
  const trimmed = token.trim().replace(/^bearer\s+/i, '')
  const parts = trimmed.split('.')
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return { ok: false, error: 'A JWT has exactly three Base64URL segments separated by dots.' }
  }
  const [headerPart, payloadPart, signature] = parts
  const header = decodeSegment(headerPart)
  if (typeof header === 'string') return { ok: false, error: `Header: ${header}` }
  const payload = decodeSegment(payloadPart)
  if (typeof payload === 'string') return { ok: false, error: `Payload: ${payload}` }

  const claims = payload as JwtClaims
  const warnings: string[] = []
  const nowSeconds = Math.floor(Date.now() / 1000)
  let status: JwtStatus = 'no-expiry'

  if (typeof claims.exp === 'number') {
    status = claims.exp <= nowSeconds ? 'expired' : 'valid'
    if (status === 'expired') warnings.push('Token is expired (exp is in the past).')
  } else {
    warnings.push('Token has no exp claim — expiry cannot be checked.')
  }
  if (typeof claims.nbf === 'number' && claims.nbf > nowSeconds) {
    status = 'not-yet-valid'
    warnings.push('Token is not valid yet (nbf is in the future).')
  }
  if (typeof claims.iat === 'number' && claims.iat > nowSeconds) {
    warnings.push('Issued-at (iat) is in the future — check the issuer clock.')
  }
  if (!claims.iss) warnings.push('Missing iss (issuer) claim.')
  if (typeof header.alg === 'string' && header.alg.toLowerCase() === 'none') {
    warnings.push('Algorithm is "none" — this token is unsigned.')
  }
  warnings.push('Decoding does NOT verify the signature. Treat contents as untrusted.')

  return {
    ok: true,
    value: {
      header,
      payload: claims,
      signature,
      status,
      warnings,
      parts: { header: headerPart, payload: payloadPart, signature },
    },
  }
}

export function looksLikeJwt(input: string): boolean {
  const trimmed = input.trim().replace(/^bearer\s+/i, '')
  return /^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*$/.test(trimmed) || /^[\w-]+\.[\w-]+\.[\w-]+$/.test(trimmed)
}
