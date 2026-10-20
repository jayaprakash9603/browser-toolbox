import { XMLParser } from 'fast-xml-parser'

import { newRuleId } from '../interceptorService'
import type { InterceptorRule } from '../types'

export function importCharlesXml(raw: string, groupId = 'default'): { rules: InterceptorRule[]; warnings: string[] } {
  const warnings: string[] = ['Charles Map Local is not supported in the extension']
  const rules: InterceptorRule[] = []
  const now = Date.now()
  try {
    const parser = new XMLParser({ ignoreAttributes: false })
    const doc = parser.parse(raw) as Record<string, unknown>
    const mapRemote = (doc.charles as Record<string, unknown>)?.map as Record<string, unknown> | undefined
    const locations = (mapRemote?.mapRemote as { location?: unknown[] })?.location ?? []
    const list = Array.isArray(locations) ? locations : [locations]
    for (const loc of list) {
      const item = loc as { host?: string; path?: string; port?: string; protocol?: string }
      const host = item.host ?? '*'
      rules.push({
        id: newRuleId(),
        name: `Charles map ${host}`,
        enabled: true,
        groupId,
        priority: 1,
        createdAt: now,
        updatedAt: now,
        type: 'redirect',
        source: { field: 'host', operator: 'equals', value: host },
        destination: `${item.protocol ?? 'https'}://${host}${item.path ?? ''}`,
      })
    }
  } catch {
    warnings.push('Failed to parse Charles XML')
  }
  return { rules, warnings }
}
