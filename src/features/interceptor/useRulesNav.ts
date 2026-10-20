import { useCallback, useMemo, useState } from 'react'

import { useRouter } from '@/app/router'
import type { InterceptorRuleType } from '@/core/interceptor'

export type RulesView = 'list' | 'editor' | 'templates'

export interface RulesNav {
  view: RulesView
  ruleId: string | null
  ruleType: InterceptorRuleType | null
  goList: () => void
  goTemplates: () => void
  goEditor: (ruleId: string, type?: InterceptorRuleType) => void
  goNewRule: (type: InterceptorRuleType) => void
}

function parseSearch(search: string) {
  const params = new URLSearchParams(search)
  const view = (params.get('rulesView') as RulesView) || 'list'
  return {
    view: ['list', 'editor', 'templates'].includes(view) ? view : 'list',
    ruleId: params.get('rule'),
    ruleType: params.get('type') as InterceptorRuleType | null,
  }
}

function buildSearch(
  current: string,
  patch: { view?: RulesView; rule?: string | null; type?: string | null },
): string {
  const params = new URLSearchParams(current)
  if (patch.view) params.set('rulesView', patch.view)
  if (patch.rule !== undefined) {
    if (patch.rule) params.set('rule', patch.rule)
    else params.delete('rule')
  }
  if (patch.type !== undefined) {
    if (patch.type) params.set('type', patch.type)
    else params.delete('type')
  }
  const q = params.toString()
  return q ? `?${q}` : ''
}

/** Hash-router navigation for the side panel; use `embedded` for DevTools local state. */
export function useRulesNav(embedded = false): RulesNav {
  const { path, search, navigate } = useRouter()
  const [local, setLocal] = useState(() => ({
    view: 'list' as RulesView,
    ruleId: null as string | null,
    ruleType: null as InterceptorRuleType | null,
  }))

  const parsed = useMemo(() => parseSearch(search), [search])

  const go = useCallback(
    (next: { view: RulesView; rule?: string | null; type?: string | null }) => {
      if (embedded) {
        setLocal({
          view: next.view,
          ruleId: next.rule ?? null,
          ruleType: (next.type as InterceptorRuleType) ?? null,
        })
        return
      }
      const nextSearch = buildSearch(search, next)
      navigate(`${path}${nextSearch}`)
    },
    [embedded, navigate, path, search],
  )

  const view = embedded ? local.view : parsed.view
  const ruleId = embedded ? local.ruleId : parsed.ruleId
  const ruleType = embedded ? local.ruleType : parsed.ruleType

  return {
    view,
    ruleId,
    ruleType,
    goList: () => go({ view: 'list', rule: null, type: null }),
    goTemplates: () => go({ view: 'templates', rule: null, type: null }),
    goEditor: (id, type) => go({ view: 'editor', rule: id, type: type ?? null }),
    goNewRule: (type) => go({ view: 'editor', rule: 'new', type }),
  }
}
