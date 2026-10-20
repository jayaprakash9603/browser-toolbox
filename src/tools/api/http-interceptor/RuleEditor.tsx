import type { InterceptorRule, InterceptorRuleType } from '@/core/interceptor'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

import { SourceConditionField } from './SourceConditionField'

const RULE_TYPES: InterceptorRuleType[] = [
  'redirect',
  'replace',
  'queryParam',
  'headers',
  'userAgent',
  'cancel',
  'mockApi',
  'mockGraphql',
  'modifyResponse',
  'modifyRequestBody',
  'statusCode',
  'delay',
  'insertScript',
]

interface Props {
  rule: InterceptorRule
  onChange: (rule: InterceptorRule) => void
}

export function RuleEditor({ rule, onChange }: Props) {
  const setType = (type: InterceptorRuleType) => {
    const base = { ...rule, type, updatedAt: Date.now() } as InterceptorRule
    onChange(base)
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={rule.name}
        onChange={(e) => onChange({ ...rule, name: e.target.value, updatedAt: Date.now() })}
        placeholder="Rule name"
      />
      <Select value={rule.type} onValueChange={(v) => setType(v as InterceptorRuleType)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {RULE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SourceConditionField
        value={rule.source}
        onChange={(source) => onChange({ ...rule, source, updatedAt: Date.now() })}
      />
      {rule.type === 'redirect' && (
        <Input
          value={rule.destination}
          onChange={(e) => onChange({ ...rule, destination: e.target.value, updatedAt: Date.now() })}
          placeholder="Destination URL"
        />
      )}
      {rule.type === 'replace' && (
        <>
          <Input
            value={rule.from}
            onChange={(e) => onChange({ ...rule, from: e.target.value, updatedAt: Date.now() })}
            placeholder="From (regex)"
          />
          <Input
            value={rule.to}
            onChange={(e) => onChange({ ...rule, to: e.target.value, updatedAt: Date.now() })}
            placeholder="To (substitution)"
          />
        </>
      )}
      {rule.type === 'mockApi' && (
        <>
          <Input
            type="number"
            value={rule.status}
            onChange={(e) => onChange({ ...rule, status: Number(e.target.value), updatedAt: Date.now() })}
          />
          <Textarea
            value={rule.body ?? ''}
            onChange={(e) => onChange({ ...rule, body: e.target.value, bodySource: 'static', updatedAt: Date.now() })}
            rows={6}
            className="font-mono text-xs"
          />
        </>
      )}
      {rule.type === 'delay' && (
        <Input
          type="number"
          value={rule.delayMs}
          onChange={(e) => onChange({ ...rule, delayMs: Number(e.target.value), updatedAt: Date.now() })}
          placeholder="Delay ms"
        />
      )}
      {rule.type === 'insertScript' && (
        <Textarea
          value={rule.code ?? ''}
          onChange={(e) =>
            onChange({
              ...rule,
              code: e.target.value,
              scriptSource: 'inline',
              kind: 'js',
              timing: 'document_start',
              updatedAt: Date.now(),
            })
          }
          rows={8}
          className="font-mono text-xs"
        />
      )}
    </div>
  )
}
