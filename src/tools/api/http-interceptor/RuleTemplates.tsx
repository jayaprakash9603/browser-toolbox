import { newRuleId } from '@/core/interceptor'
import type { InterceptorRule } from '@/core/interceptor'
import { Button } from '@/shared/components/ui/button'

const now = () => Date.now()

export const RULE_TEMPLATES: { label: string; build: () => InterceptorRule }[] = [
  {
    label: 'Switch API host',
    build: () => ({
      id: newRuleId(),
      name: 'API host → staging',
      enabled: true,
      groupId: 'default',
      priority: 10,
      createdAt: now(),
      updatedAt: now(),
      type: 'replace',
      source: { field: 'host', operator: 'equals', value: 'api.example.com' },
      from: 'api\\.example\\.com',
      to: 'staging-api.example.com',
    }),
  },
  {
    label: 'Add CORS headers',
    build: () => ({
      id: newRuleId(),
      name: 'CORS *',
      enabled: true,
      groupId: 'default',
      priority: 5,
      createdAt: now(),
      updatedAt: now(),
      type: 'headers',
      source: { field: 'url', operator: 'wildcard', value: '*' },
      response: [
        { name: 'Access-Control-Allow-Origin', operation: 'set', value: '*' },
        { name: 'Access-Control-Allow-Credentials', operation: 'set', value: 'true' },
      ],
    }),
  },
  {
    label: 'Mock JSON API',
    build: () => ({
      id: newRuleId(),
      name: 'Mock API 200',
      enabled: true,
      groupId: 'default',
      priority: 20,
      createdAt: now(),
      updatedAt: now(),
      type: 'mockApi',
      source: { field: 'url', operator: 'contains', value: '/api/' },
      status: 200,
      bodySource: 'static',
      body: '{"ok":true}',
      contentType: 'application/json',
    }),
  },
]

interface Props {
  onAdd: (rule: InterceptorRule) => void
}

export function RuleTemplates({ onAdd }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {RULE_TEMPLATES.map((tpl) => (
        <Button key={tpl.label} type="button" variant="outline" size="sm" onClick={() => onAdd(tpl.build())}>
          {tpl.label}
        </Button>
      ))}
    </div>
  )
}
