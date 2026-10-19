import { ShieldCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimatedNumber } from '@/features/adblock/AnimatedNumber'
import type { ProtectionStats } from '@/core/protection'
import { Switch } from '@/shared/components/ui/switch'

export function ProtectionToolHeader({
  enabled,
  stats,
  onToggle,
}: {
  enabled: boolean
  stats: ProtectionStats | null
  onToggle: (on: boolean) => void
}) {
  const { t } = useTranslation()
  const total = stats ? Object.values(stats.blocked).reduce((sum, n) => sum + (n ?? 0), 0) : 0

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className={`size-5 ${enabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
          <div>
            <h2 className="text-sm font-semibold">{t('protection.header.title')}</h2>
            <p className="text-[11px] text-muted-foreground">{t('protection.header.subtitle')}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} aria-label={t('protection.header.title')} />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">
        <AnimatedNumber value={total} />
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {t('protection.header.blocked')}
        </span>
      </p>
    </div>
  )
}
