import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, PinIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import {
  deleteRule,
  duplicateRule,
  getInterceptorState,
  testRulesAgainstUrl,
  upsertRule,
  type InterceptorRule,
  type InterceptorState,
  type SourceCondition,
} from '@/core/interceptor'
import { exportRulesJson } from '@/core/interceptor/importers/requestly'
import { createDefaultRule } from '@/features/interceptor/ruleDefaults'
import { RULE_TYPE_LABELS } from '@/features/interceptor/ruleTypeMeta'
import type { RulesNav } from '@/features/interceptor/useRulesNav'
import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

import { RuleEditor, convertRuleType } from './RuleEditor'
import { SourceConditionField } from './SourceConditionField'
import type { InterceptorRuleType } from '@/core/interceptor'

interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
  nav: RulesNav
}

export function RuleEditorPage({ state, onStateChange, nav }: Props) {
  const { t } = useTranslation()
  const isNew = nav.ruleId === 'new'
  const existing = state.rules.find((r) => r.id === nav.ruleId)

  const initial = useMemo(() => {
    if (isNew) return createDefaultRule(nav.ruleType ?? 'redirect')
    return existing ?? createDefaultRule('redirect')
  }, [isNew, nav.ruleId, nav.ruleType, existing])

  const [draft, setDraft] = useState<InterceptorRule>(initial)
  const [dirty, setDirty] = useState(isNew)
  const [testUrl, setTestUrl] = useState('https://example.com')
  const [testOpen, setTestOpen] = useState(false)

  useEffect(() => {
    setDraft(initial)
    setDirty(isNew)
  }, [initial, isNew])

  const patch = (next: Partial<InterceptorRule>) => {
    setDraft((d) => ({ ...d, ...next, updatedAt: Date.now() } as InterceptorRule))
    setDirty(true)
  }

  const save = useCallback(async () => {
    const rules = await upsertRule(draft)
    onStateChange({ ...state, rules })
    setDirty(false)
    if (isNew) nav.goEditor(draft.id)
    void sendMessage({ type: 'INTERCEPTOR_SYNC' })
  }, [draft, isNew, nav, onStateChange, state])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  const back = () => {
    if (dirty && !window.confirm(t('interceptor.editor.unsaved'))) return
    nav.goList()
  }

  const extra = draft.extraSources ?? []
  const setExtra = (sources: SourceCondition[]) => patch({ extraSources: sources })

  const subtitle = `${RULE_TYPE_LABELS[draft.type]} · ${draft.source.value || '…'}`

  const testResult = testRulesAgainstUrl([draft], testUrl, undefined, state.groups)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <Button type="button" variant="ghost" size="icon-sm" onClick={back}>
          <ArrowLeftIcon />
        </Button>
        <span className="text-xs text-muted-foreground">{t('interceptor.rules.nav.mine')}</span>
        <Input
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="h-8 max-w-[200px] border-0 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            <Switch checked={draft.enabled} onCheckedChange={(on) => patch({ enabled: on })} />
            {draft.enabled ? t('interceptor.editor.enabled') : t('interceptor.editor.disabled')}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => patch({ pinned: !draft.pinned })}
          >
            <PinIcon className={draft.pinned ? 'text-primary' : 'text-muted-foreground'} />
          </Button>
          <Select
            value={draft.groupId}
            onValueChange={(groupId) => patch({ groupId })}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              {state.groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => setTestOpen((o) => !o)}>
            {t('interceptor.testRun')}
          </Button>
          <Button type="button" size="sm" onClick={() => void save()}>
            {t('interceptor.editor.save')}
          </Button>
        </div>
      </div>

      <Input
        value={draft.description ?? ''}
        onChange={(e) => patch({ description: e.target.value })}
        placeholder={subtitle}
        className="text-sm text-muted-foreground"
      />

      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">{t('interceptor.editor.ifRequest')}</p>
        <SourceConditionField value={draft.source} onChange={(source) => patch({ source })} />
        {extra.map((cond, i) => (
          <div key={i} className="mt-2 flex items-start gap-2">
            <SourceConditionField
              value={cond}
              onChange={(source) => setExtra(extra.map((x, j) => (j === i ? source : x)))}
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setExtra(extra.filter((_, j) => j !== i))}>
              <Trash2Icon />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full border-dashed"
          onClick={() =>
            setExtra([...extra, { field: 'url', operator: 'contains', value: '' }])
          }
        >
          <PlusIcon className="size-3.5" />
          {t('interceptor.editor.addCondition')}
        </Button>
      </div>

      <div className="rounded-lg border p-3">
        <Select
          value={draft.type}
          onValueChange={(v) => {
            const next = convertRuleType(draft, v as InterceptorRuleType)
            setDraft(next)
            setDirty(true)
          }}
        >
          <SelectTrigger className="mb-3 w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RULE_TYPE_LABELS) as InterceptorRuleType[]).map((type) => (
              <SelectItem key={type} value={type}>{RULE_TYPE_LABELS[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RuleEditor rule={draft} onChange={(r) => { setDraft(r); setDirty(true) }} actionsOnly />
      </div>

      {testOpen && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <Input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://" className="mb-2" />
          <p>
            {testResult.matches ? t('interceptor.editor.testMatch') : t('interceptor.editor.testNoMatch')}
            {testResult.transformedUrl && ` → ${testResult.transformedUrl}`}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void duplicateRule(draft.id).then(() => getInterceptorState().then(onStateChange))}
          disabled={isNew}
        >
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void navigator.clipboard.writeText(exportRulesJson([draft], state.groups))}
        >
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (!window.confirm('Delete rule?')) return
            void deleteRule(draft.id).then((rules) => {
              onStateChange({ ...state, rules })
              nav.goList()
            })
          }}
          disabled={isNew}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
