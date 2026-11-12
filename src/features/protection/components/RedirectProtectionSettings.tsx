import type { LucideIcon } from 'lucide-react'
import { GitBranchIcon, RefreshCwIcon, ShieldIcon, SparklesIcon, WorkflowIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ProtectionState, UnknownRedirectBehavior } from '@/core/protection'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { Switch } from '@/shared/components/ui/switch'

type RedirectToggleKey =
  | 'enabled'
  | 'blockMalicious'
  | 'detectAutomatic'
  | 'detectJavascript'
  | 'detectMetaRefresh'
  | 'detectChains'
  | 'allowPayment'
  | 'allowAuth'
  | 'allowBanking'

interface Row {
  key: RedirectToggleKey
  icon: LucideIcon
}

function ToggleList({
  rows,
  state,
  disabled,
  onPatch,
}: {
  rows: Row[]
  state: ProtectionState['redirectProtection']
  disabled: boolean
  onPatch: (patch: Partial<ProtectionState['redirectProtection']>) => void
}) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {rows.map((row) => {
        const Icon = row.icon
        return (
          <li key={row.key} className="flex items-center gap-3 px-3 py-2.5">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{t(`protection.smartRedirect.${row.key}`)}</p>
              <p className="text-[11px] text-muted-foreground">{t(`protection.smartRedirect.${row.key}Description`)}</p>
            </div>
            <Switch
              checked={state[row.key]}
              disabled={disabled}
              onCheckedChange={(on) => onPatch({ [row.key]: on })}
              aria-label={t(`protection.smartRedirect.${row.key}`)}
            />
          </li>
        )
      })}
    </ul>
  )
}

const DETECTION_ROWS: Row[] = [
  { key: 'enabled', icon: SparklesIcon },
  { key: 'blockMalicious', icon: ShieldIcon },
  { key: 'detectAutomatic', icon: RefreshCwIcon },
  { key: 'detectJavascript', icon: GitBranchIcon },
  { key: 'detectMetaRefresh', icon: RefreshCwIcon },
  { key: 'detectChains', icon: GitBranchIcon },
]

const WORKFLOW_ROWS: Row[] = [
  { key: 'allowPayment', icon: WorkflowIcon },
  { key: 'allowAuth', icon: WorkflowIcon },
  { key: 'allowBanking', icon: WorkflowIcon },
]

const UNKNOWN_OPTIONS: { value: UnknownRedirectBehavior; labelKey: string }[] = [
  { value: 'block', labelKey: 'protection.smartRedirect.unknownBlock' },
  { value: 'warn', labelKey: 'protection.smartRedirect.unknownWarn' },
  { value: 'allow', labelKey: 'protection.smartRedirect.unknownAllow' },
]

export function RedirectProtectionSettings({
  state,
  disabled,
  onPatch,
}: {
  state: ProtectionState
  disabled: boolean
  onPatch: (patch: Partial<ProtectionState>) => void
}) {
  const { t } = useTranslation()
  const rp = state.redirectProtection
  const patchRp = (patch: Partial<ProtectionState['redirectProtection']>) =>
    onPatch({ redirectProtection: { ...rp, ...patch } })
  const smartDisabled = disabled || !rp.enabled

  return (
    <div className="flex flex-col gap-3">
      <ToggleList
        rows={DETECTION_ROWS.filter((r) => r.key === 'enabled')}
        state={rp}
        disabled={disabled}
        onPatch={patchRp}
      />
      <ToggleList
        rows={DETECTION_ROWS.filter((r) => r.key !== 'enabled')}
        state={rp}
        disabled={smartDisabled}
        onPatch={patchRp}
      />
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('protection.smartRedirect.workflowsTitle')}
      </h4>
      <ToggleList rows={WORKFLOW_ROWS} state={rp} disabled={smartDisabled} onPatch={patchRp} />
      <div className="rounded-xl border bg-card p-3">
        <p className="mb-2 text-xs font-medium">{t('protection.smartRedirect.unknownTitle')}</p>
        <ChoiceChips
          value={rp.unknownBehavior}
          onValueChange={(value) => patchRp({ unknownBehavior: value })}
          options={UNKNOWN_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
          ariaLabel={t('protection.smartRedirect.unknownTitle')}
          columns={3}
        />
      </div>
    </div>
  )
}
