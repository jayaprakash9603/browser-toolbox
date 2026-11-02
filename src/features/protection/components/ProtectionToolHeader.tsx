import { useTranslation } from 'react-i18next'

import { AnimatedNumber } from '@/features/adblock/AnimatedNumber'
import type { ProtectionStats } from '@/core/protection'
import { ProtectionPowerCard } from './ProtectionPowerCard'

export function ProtectionToolHeader({
  enabled,
  stats,
  onToggle,
}: {
  enabled: boolean
  stats: ProtectionStats | null
  onToggle: (on: boolean) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const total = stats ? Object.values(stats.blocked).reduce((sum, n) => sum + (n ?? 0), 0) : 0
  return (
    <ProtectionPowerCard name={t('protection.header.title')} enabled={enabled} onToggle={onToggle}>
      <AnimatedNumber value={total} className="font-semibold tabular-nums" />{' '}
      {t('protection.header.blocked')}
    </ProtectionPowerCard>
  )
}
