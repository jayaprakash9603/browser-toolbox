import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PinIcon, CopyIcon, Trash2Icon } from 'lucide-react'

import {
  deleteRule,
  duplicateRule,
  getInterceptorState,
  newRuleId,
  toggleRule,
  upsertRule,
  type InterceptorRule,
} from '@/core/interceptor'
import type { InterceptorState } from '@/core/interceptor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Badge } from '@/shared/components/ui/badge'

import { RuleEditor } from './RuleEditor'
import { RuleTemplates } from './RuleTemplates'
import { TestUrlBox } from './TestUrlBox'

interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
}

function defaultRule(): InterceptorRule {
  const now = Date.now()
  return {
    id: newRuleId(),
    name: 'New rule',
    enabled: true,
    groupId: 'default',
    priority: 1,
    createdAt: now,
    updatedAt: now,
    type: 'redirect',
    source: { field: 'url', operator: 'contains', value: '' },
    destination: '',
  }
}

export function RulesTab({ state, onStateChange }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(state.rules[0]?.id ?? null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...state.rules].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    if (!q) return list
    return list.filter((r) => r.name.toLowerCase().includes(q) || r.type.includes(q))
  }, [state.rules, query])

  const selected = state.rules.find((r) => r.id === selectedId) ?? null

  const addRule = async (rule: InterceptorRule) => {
    const rules = await upsertRule(rule)
    onStateChange({ ...state, rules })
    setSelectedId(rule.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <TestUrlBox rules={state.rules} />
      <RuleTemplates onAdd={(r) => void addRule(r)} />
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('interceptor.searchRules')}
        />
        <Button type="button" size="sm" onClick={() => void addRule(defaultRule())}>
          {t('interceptor.newRule')}
        </Button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('interceptor.noRules')}</p>
      ) : (
        <div className="grid gap-3 @[520px]:grid-cols-2">
          <ul className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border p-1">
            {filtered.map((rule) => (
              <li key={rule.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(rule.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${selectedId === rule.id ? 'bg-muted' : ''}`}
                >
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(on) => {
                      void toggleRule(rule.id, on).then(() => getInterceptorState()).then((next) => {
                        if (next) onStateChange(next)
                      })
                    }}
                    aria-label={rule.name}
                  />
                  <span className="min-w-0 flex-1 truncate">{rule.name}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{rule.type}</Badge>
                  {rule.pinned && <PinIcon className="size-3 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border p-3">
            {selected ? (
              <>
                <RuleEditor
                  rule={selected}
                  onChange={(next) => {
                    void upsertRule(next).then((rules) => {
                      onStateChange({ ...state, rules })
                    })
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void duplicateRule(selected.id).then(() =>
                        getInterceptorState().then((next) => {
                          if (next) onStateChange(next)
                        }),
                      )
                    }
                  >
                    <CopyIcon className="size-3.5" /> Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void deleteRule(selected.id).then((rules) => {
                        onStateChange({ ...state, rules })
                        setSelectedId(rules[0]?.id ?? null)
                      })
                    }}
                  >
                    <Trash2Icon className="size-3.5" /> Delete
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a rule</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
