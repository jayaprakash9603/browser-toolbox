import { newRuleId } from '../interceptorService'
import type { InterceptorRule, RuleGroup } from '../types'

interface RequestlyExport {
  rules?: Array<Record<string, unknown>>
}

export function importRequestlyJson(
  raw: string,
  groupId = 'default',
): { rules: InterceptorRule[]; warnings: string[] } {
  const warnings: string[] = []
  let data: RequestlyExport
  try {
    data = JSON.parse(raw) as RequestlyExport
  } catch {
    return { rules: [], warnings: ['Invalid JSON'] }
  }
  const rules: InterceptorRule[] = []
  const now = Date.now()
  for (const item of data.rules ?? []) {
    const ruleType = String(item.ruleType ?? item.type ?? '')
    const base = {
      id: newRuleId(),
      name: String(item.name ?? 'Imported rule'),
      enabled: item.status !== 'Inactive',
      groupId,
      priority: Number(item.priority) || 1,
      createdAt: now,
      updatedAt: now,
      source: {
        field: 'url' as const,
        operator: 'contains' as const,
        value: String((item.pairs as { source?: { value?: string } }[])?.[0]?.source?.value ?? '/'),
      },
    }
    if (ruleType.includes('Redirect') || ruleType === 'Redirect') {
      rules.push({
        ...base,
        type: 'redirect',
        destination: String(item.destination ?? item.to ?? ''),
      })
    } else if (ruleType.includes('Headers')) {
      rules.push({
        ...base,
        type: 'headers',
        request: [],
        response: [],
      })
    } else if (ruleType.includes('Cancel') || ruleType.includes('Block')) {
      rules.push({ ...base, type: 'cancel' })
    } else if (ruleType.includes('Response') || ruleType.includes('Mock')) {
      rules.push({
        ...base,
        type: 'mockApi',
        status: 200,
        bodySource: 'static',
        body: String(item.response ?? '{}'),
        contentType: 'application/json',
      })
    } else {
      warnings.push(`Skipped unsupported rule type: ${ruleType}`)
    }
  }
  return { rules, warnings }
}

export function exportRulesJson(rules: InterceptorRule[], groups: RuleGroup[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), groups, rules }, null, 2)
}
