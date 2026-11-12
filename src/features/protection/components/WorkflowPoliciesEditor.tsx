import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { WorkflowHostPolicy, WorkflowKind } from '@/core/protection'
import { normalizeHostname } from '@/core/adblock/hostname'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

const KINDS: WorkflowKind[] = ['payment', 'auth', 'banking']

export function WorkflowPoliciesEditor({
  policies,
  disabled,
  onChange,
}: {
  policies: WorkflowHostPolicy[]
  disabled: boolean
  onChange: (policies: WorkflowHostPolicy[]) => void
}) {
  const { t } = useTranslation()
  const [host, setHost] = useState('')
  const [kind, setKind] = useState<WorkflowKind>('payment')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Input
          value={host}
          disabled={disabled}
          onChange={(e) => setHost(e.target.value)}
          placeholder={t('protection.workflow.placeholder')}
          className="h-8 min-w-[8rem] flex-1 text-xs"
        />
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={kind}
          disabled={disabled}
          onChange={(e) => setKind(e.target.value as WorkflowKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`protection.workflow.kind.${k}`)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={disabled}
          onClick={() => {
            const normalized = normalizeHostname(host)
            if (!normalized) return
            if (policies.some((p) => p.host === normalized && p.kind === kind)) return
            onChange([...policies, { host: normalized, kind }])
            setHost('')
          }}
        >
          {t('protection.workflow.add')}
        </Button>
      </div>
      {policies.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('protection.workflow.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {policies.map((policy) => (
            <li
              key={`${policy.kind}:${policy.host}`}
              className="flex items-center justify-between rounded-md border px-2 py-1 text-xs"
            >
              <span>
                {policy.host}{' '}
                <span className="text-muted-foreground">({t(`protection.workflow.kind.${policy.kind}`)})</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                disabled={disabled}
                onClick={() => onChange(policies.filter((p) => p !== policy))}
              >
                {t('protection.workflow.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
