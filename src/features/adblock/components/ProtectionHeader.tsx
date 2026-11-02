import { useTranslation } from 'react-i18next'

import { sumCounts, type AdblockTotals } from '@/core/adblock'
import { ProtectionPowerCard } from '@/features/protection/components/ProtectionPowerCard'

import { AnimatedNumber } from '../AnimatedNumber'

export function ProtectionHeader({
  enabled,
  totals,
  onToggle,
}: {
  enabled: boolean
  totals: AdblockTotals
  onToggle: (enabled: boolean) => Promise<boolean>
}) {
  const { t } = useTranslation()
  return (
    <ProtectionPowerCard
      name={t('tools.privacy.ad-blocker.name')}
      enabled={enabled}
      onToggle={onToggle}
    >
      <AnimatedNumber value={sumCounts(totals)} className="font-semibold tabular-nums" />{' '}
      {t('adblock.blockedInTotal')}
    </ProtectionPowerCard>
  )
}
