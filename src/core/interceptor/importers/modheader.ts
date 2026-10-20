import { newRuleId } from '../interceptorService'
import type { HeaderChange, HeadersRule } from '../types'

export function importModHeaderProfiles(
  raw: string,
  groupId = 'default',
): { rules: HeadersRule[]; warnings: string[] } {
  const warnings: string[] = []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { rules: [], warnings: ['Invalid JSON'] }
  }
  const profiles = Array.isArray(data) ? data : (data as { profiles?: unknown[] }).profiles ?? []
  const rules: HeadersRule[] = []
  const now = Date.now()
  for (const profile of profiles) {
    const p = profile as {
      title?: string
      headers?: { name: string; value: string }[]
      requestUrl?: string
    }
    const request: HeaderChange[] = (p.headers ?? []).map((h) => ({
      name: h.name,
      operation: 'set',
      value: h.value,
    }))
    if (!request.length) continue
    rules.push({
      id: newRuleId(),
      name: p.title ?? 'ModHeader profile',
      enabled: true,
      groupId,
      priority: 1,
      createdAt: now,
      updatedAt: now,
      type: 'headers',
      source: {
        field: 'url',
        operator: p.requestUrl ? 'contains' : 'wildcard',
        value: p.requestUrl ?? '*',
      },
      request,
    })
  }
  if (!rules.length) warnings.push('No ModHeader profiles found')
  return { rules, warnings }
}
