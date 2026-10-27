import { PlusIcon, Trash2Icon } from 'lucide-react'

import { USER_AGENT_PRESETS } from '@/core/interceptor'
import type { HeaderChange, HttpMethod, InterceptorRule, InterceptorRuleType } from '@/core/interceptor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'

import { RULE_TYPE_LABELS } from '@/features/interceptor/ruleTypeMeta'

import { SourceConditionField } from './SourceConditionField'

export { RULE_TYPE_LABELS } from '@/features/interceptor/ruleTypeMeta'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const UA_LABELS: Record<string, string> = {
  chromeDesktop: 'Chrome (Windows desktop)',
  chromeAndroid: 'Chrome (Android mobile)',
  safariIos: 'Safari (iPhone)',
  firefoxDesktop: 'Firefox (Windows desktop)',
  custom: 'Custom',
}

/** Fresh type-specific fields so switching the type never leaves stale data behind. */
export function convertRuleType(rule: InterceptorRule, type: InterceptorRuleType): InterceptorRule {
  const common = {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    pinned: rule.pinned,
    groupId: rule.groupId,
    priority: rule.priority,
    createdAt: rule.createdAt,
    updatedAt: Date.now(),
    source: rule.source,
    filters: rule.filters,
  }
  switch (type) {
    case 'redirect':
      return { ...common, type, destination: '' }
    case 'replace':
      return { ...common, type, from: '', to: '' }
    case 'queryParam':
      return { ...common, type, addOrReplace: [{ key: '', value: '' }], remove: [] }
    case 'headers':
      return { ...common, type, request: [], response: [{ name: '', operation: 'set', value: '' }] }
    case 'userAgent':
      return { ...common, type, preset: 'chromeAndroid' }
    case 'cancel':
      return { ...common, type }
    case 'mockApi':
      return { ...common, type, status: 200, bodySource: 'static', body: '{}', contentType: 'application/json' }
    case 'mockGraphql':
      return { ...common, type, status: 200, bodySource: 'static', body: '{"data":{}}' }
    case 'modifyResponse':
      return { ...common, type, bodySource: 'static', body: '' }
    case 'modifyRequestBody':
      return { ...common, type, bodySource: 'static', body: '' }
    case 'statusCode':
      return { ...common, type, status: 500 }
    case 'delay':
      return { ...common, type, delayMs: 2000 }
    case 'insertScript':
      return { ...common, type, kind: 'js', timing: 'document_idle', scriptSource: 'inline', code: '' }
  }
}

interface Props {
  rule: InterceptorRule
  onChange: (rule: InterceptorRule) => void
  /** Hide name, type, and single source row (full-page editor owns those). */
  actionsOnly?: boolean
  readOnly?: boolean
}

function HeaderList({
  label,
  items,
  onChange,
}: {
  label: string
  items: HeaderChange[]
  onChange: (items: HeaderChange[]) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onChange([...items, { name: '', operation: 'set', value: '' }])}
        >
          <PlusIcon /> Add
        </Button>
      </div>
      {items.map((h, i) => (
        <div key={i} className="grid grid-cols-[5.5rem_1fr_1fr_auto] gap-1.5">
          <Select
            value={h.operation}
            onValueChange={(op) =>
              onChange(items.map((x, j) => (j === i ? { ...x, operation: op as HeaderChange['operation'] } : x)))
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="set">Set</SelectItem>
              <SelectItem value="append">Append</SelectItem>
              <SelectItem value="remove">Remove</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={h.name}
            placeholder="Header"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
          />
          <Input
            value={h.value ?? ''}
            placeholder="Value"
            disabled={h.operation === 'remove'}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
          />
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2Icon />
          </Button>
        </div>
      ))}
    </div>
  )
}

export function RuleEditor({ rule, onChange, actionsOnly, readOnly }: Props) {
  const patch = (next: Partial<InterceptorRule>) =>
    onChange({ ...rule, ...next, updatedAt: Date.now() } as InterceptorRule)

  const disabled = readOnly

  return (
    <div className="flex flex-col gap-3">
      {!actionsOnly && (
        <>
          <Input
            value={rule.name}
            readOnly={disabled}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Rule name"
          />
          <Select
            value={rule.type}
            disabled={disabled}
            onValueChange={(v) => onChange(convertRuleType(rule, v as InterceptorRuleType))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(RULE_TYPE_LABELS) as InterceptorRuleType[]).map((t) => (
                <SelectItem key={t} value={t}>{RULE_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SourceConditionField value={rule.source} onChange={(source) => patch({ source })} />
        </>
      )}

      {rule.type === 'redirect' && (
        <Input value={rule.destination} onChange={(e) => patch({ destination: e.target.value })} placeholder="Redirect to URL" />
      )}

      {rule.type === 'replace' && (
        <>
          <Input value={rule.from} onChange={(e) => patch({ from: e.target.value })} placeholder="Match (RE2 regex, use groups)" />
          <Input value={rule.to} onChange={(e) => patch({ to: e.target.value })} placeholder="Replace with (\1, \2 for groups)" />
        </>
      )}

      {rule.type === 'queryParam' && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium">Add or replace</span>
          {(rule.addOrReplace ?? []).map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <Input
                value={p.key}
                placeholder="Key"
                onChange={(e) =>
                  patch({ addOrReplace: (rule.addOrReplace ?? []).map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })
                }
              />
              <Input
                value={p.value}
                placeholder="Value"
                onChange={(e) =>
                  patch({ addOrReplace: (rule.addOrReplace ?? []).map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => patch({ addOrReplace: (rule.addOrReplace ?? []).filter((_, j) => j !== i) })}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => patch({ addOrReplace: [...(rule.addOrReplace ?? []), { key: '', value: '' }] })}
          >
            <PlusIcon /> Add param
          </Button>
          <Input
            value={(rule.remove ?? []).join(',')}
            onChange={(e) => patch({ remove: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="Remove params (comma separated)"
          />
        </div>
      )}

      {rule.type === 'headers' && (
        <>
          <HeaderList label="Request headers" items={rule.request ?? []} onChange={(request) => patch({ request })} />
          <HeaderList label="Response headers" items={rule.response ?? []} onChange={(response) => patch({ response })} />
        </>
      )}

      {rule.type === 'userAgent' && (
        <>
          <Select value={rule.preset ?? 'custom'} onValueChange={(preset) => patch({ preset })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...Object.keys(USER_AGENT_PRESETS), 'custom'].map((k) => (
                <SelectItem key={k} value={k}>{UA_LABELS[k] ?? k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rule.preset === 'custom' ? (
            <Input
              value={rule.customValue ?? ''}
              onChange={(e) => patch({ customValue: e.target.value })}
              placeholder="Custom User-Agent string"
            />
          ) : (
            <p className="break-all rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
              {USER_AGENT_PRESETS[rule.preset ?? 'chromeDesktop']}
            </p>
          )}
        </>
      )}

      {rule.type === 'cancel' && (
        <p className="text-xs text-muted-foreground">Matching requests are blocked before they leave the browser.</p>
      )}

      {(rule.type === 'mockApi' || rule.type === 'mockGraphql') && (
        <>
          {rule.type === 'mockGraphql' && (
            <div className="grid grid-cols-2 gap-1.5">
              <Input value={rule.operationName ?? ''} onChange={(e) => patch({ operationName: e.target.value })} placeholder="Operation name" />
              <Input value={rule.queryContains ?? ''} onChange={(e) => patch({ queryContains: e.target.value })} placeholder="Query contains" />
            </div>
          )}
          <Input type="number" value={rule.status} onChange={(e) => patch({ status: Number(e.target.value) })} placeholder="Status code" />
          <Textarea
            value={rule.body ?? ''}
            onChange={(e) => patch({ body: e.target.value, bodySource: 'static' })}
            rows={8}
            className="font-mono text-xs"
            placeholder="Response body"
          />
        </>
      )}

      {rule.type === 'modifyResponse' && (
        <>
          <Input
            type="number"
            value={rule.status ?? ''}
            onChange={(e) => patch({ status: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Status code (optional)"
          />
          <Textarea
            value={rule.body ?? ''}
            onChange={(e) => patch({ body: e.target.value, bodySource: 'static' })}
            rows={8}
            className="font-mono text-xs"
            placeholder="Static response body"
          />
        </>
      )}

      {rule.type === 'modifyRequestBody' && (
        <>
          <Textarea
            value={rule.body ?? ''}
            onChange={(e) => patch({ body: e.target.value, bodySource: 'static' })}
            rows={6}
            className="font-mono text-xs"
            placeholder="Static request body"
          />
        </>
      )}

      {rule.type === 'statusCode' && (
        <Input type="number" value={rule.status} onChange={(e) => patch({ status: Number(e.target.value) })} placeholder="Status code" />
      )}

      {rule.type === 'delay' && (
        <Input type="number" value={rule.delayMs} onChange={(e) => patch({ delayMs: Number(e.target.value) })} placeholder="Delay (ms)" />
      )}

      {rule.type === 'insertScript' && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <Select value={rule.kind} onValueChange={(kind) => patch({ kind: kind as 'js' | 'css' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="js">JavaScript</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rule.timing} onValueChange={(timing) => patch({ timing: timing as 'document_start' | 'document_idle' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document_start">Before page load</SelectItem>
                <SelectItem value="document_idle">After page load</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={rule.scriptSource === 'library' ? 'library' : 'inline'}
              onValueChange={(s) => patch({ scriptSource: s as 'inline' | 'library' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inline">Code</SelectItem>
                <SelectItem value="library">Library item</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rule.scriptSource === 'library' ? (
            <Input value={rule.libraryId ?? ''} onChange={(e) => patch({ libraryId: e.target.value })} placeholder="Library item id" />
          ) : (
            <>
              {'url' in rule && !rule.code && (
                <p className="text-xs text-muted-foreground">
                  Scripts can no longer load from a URL. Paste the script code here to keep this rule working.
                </p>
              )}
              <Textarea
                value={rule.code ?? ''}
                onChange={(e) => patch({ code: e.target.value, scriptSource: 'inline' })}
                rows={8}
                className="font-mono text-xs"
              />
            </>
          )}
        </>
      )}

      <details className="rounded border p-2 text-xs">
        <summary className="cursor-pointer font-medium">Filters (page domain, method)</summary>
        <div className="mt-2 flex flex-col gap-1.5">
          <Input
            value={(rule.filters?.pageDomains ?? []).join(',')}
            onChange={(e) =>
              patch({ filters: { ...rule.filters, pageDomains: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })
            }
            placeholder="Page domains (comma separated)"
          />
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => {
              const on = rule.filters?.methods?.includes(m) ?? false
              return (
                <label key={m} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const cur = rule.filters?.methods ?? []
                      patch({ filters: { ...rule.filters, methods: on ? cur.filter((x) => x !== m) : [...cur, m] } })
                    }}
                  />
                  {m}
                </label>
              )
            })}
          </div>
          {(rule.type === 'mockGraphql' || rule.type === 'mockApi') && (
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                value={rule.filters?.payloadKey ?? ''}
                onChange={(e) => patch({ filters: { ...rule.filters, payloadKey: e.target.value } })}
                placeholder="Request payload key"
              />
              <Input
                value={rule.filters?.payloadValue ?? ''}
                onChange={(e) => patch({ filters: { ...rule.filters, payloadValue: e.target.value } })}
                placeholder="Payload value"
              />
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
