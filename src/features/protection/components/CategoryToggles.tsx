import type { LucideIcon } from 'lucide-react'
import { BugIcon, FishIcon, ScanEyeIcon, SkullIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ProtectionState, ThreatsFile } from '@/core/protection'
import { Switch } from '@/shared/components/ui/switch'

interface Row {
  key: keyof Pick<ProtectionState, 'phishing' | 'malware' | 'scams' | 'lookalike'>
  icon: LucideIcon
  count?: number
}

export function CategoryToggles({
  state,
  threats,
  disabled,
  onPatch,
}: {
  state: ProtectionState
  threats: ThreatsFile | null
  disabled: boolean
  onPatch: (patch: Partial<ProtectionState>) => void
}) {
  const { t } = useTranslation()
  const rows: Row[] = [
    { key: 'phishing', icon: FishIcon, count: threats?.counts.phishing },
    { key: 'malware', icon: BugIcon, count: threats?.counts.malware },
    { key: 'scams', icon: SkullIcon, count: threats?.counts.scam },
    { key: 'lookalike', icon: ScanEyeIcon },
  ]

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {rows.map((row) => {
        const Icon = row.icon
        return (
          <li key={row.key} className="flex items-center gap-3 px-3 py-2.5">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{t(`protection.toggle.${row.key}`)}</p>
              <p className="text-[11px] text-muted-foreground">
                {row.count != null
                  ? t('protection.toggle.known', { count: row.count })
                  : t(`protection.toggle.${row.key}Description`)}
              </p>
            </div>
            <Switch
              checked={state[row.key]}
              disabled={disabled}
              onCheckedChange={(on) => onPatch({ [row.key]: on })}
              aria-label={t(`protection.toggle.${row.key}`)}
            />
          </li>
        )
      })}
    </ul>
  )
}
