import { newRuleId } from '../interceptorService'
import type { InterceptorRule, RedirectRule } from '../types'

interface RoEntry {
  enabled?: boolean
  type?: string
  match?: string
  substitute?: string
  files?: string[]
}

export function importResourceOverride(
  raw: string,
  groupId = 'default',
): { rules: InterceptorRule[]; warnings: string[] } {
  const warnings: string[] = []
  let data: { rules?: RoEntry[] }
  try {
    data = JSON.parse(raw) as { rules?: RoEntry[] }
  } catch {
    return { rules: [], warnings: ['Invalid JSON'] }
  }
  const rules: InterceptorRule[] = []
  const now = Date.now()
  for (const entry of data.rules ?? []) {
    const base = {
      id: newRuleId(),
      name: entry.match ?? 'Resource Override',
      enabled: entry.enabled !== false,
      groupId,
      priority: 1,
      createdAt: now,
      updatedAt: now,
      source: { field: 'url' as const, operator: 'wildcard' as const, value: entry.match ?? '*' },
    }
    if (entry.type === 'normalOverride' && entry.substitute) {
      rules.push({
        ...base,
        type: 'redirect',
        destination: entry.substitute,
      } satisfies RedirectRule)
    } else if (entry.type === 'fileOverride') {
      warnings.push(`Map local skipped for ${entry.match} (use Library + Insert Script)`)
    } else if (entry.files?.length) {
      warnings.push(`Injected file skipped for ${entry.match} (paste its code into an Insert Script rule)`)
    }
  }
  return { rules, warnings }
}
