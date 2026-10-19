import { motion, useReducedMotion } from 'motion/react'
import { ShieldCheckIcon, ShieldOffIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { sumCounts, type AdblockTotals } from '@/core/adblock'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { AnimatedNumber } from '../AnimatedNumber'

export function ProtectionHeader({
  enabled,
  totals,
  onToggle,
}: {
  enabled: boolean
  totals: AdblockTotals
  onToggle: (enabled: boolean) => void
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const Icon = enabled ? ShieldCheckIcon : ShieldOffIcon

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-3 transition-colors duration-500',
        enabled
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent'
          : 'border-muted bg-muted/40',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative grid size-11 shrink-0 place-items-center">
          {enabled && !reduceMotion && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-500/30"
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.9 }}
              />
            </>
          )}
          <motion.div
            key={enabled ? 'on' : 'off'}
            initial={reduceMotion ? false : { scale: 0.6, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={cn(
              'relative grid size-11 place-items-center rounded-full',
              enabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="size-5" />
          </motion.div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {enabled ? t('adblock.protectionOn') : t('adblock.protectionOff')}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {enabled ? (
              <>
                <AnimatedNumber value={sumCounts(totals)} className="font-semibold text-foreground tabular-nums" />{' '}
                {t('adblock.blockedInTotal')}
              </>
            ) : (
              t('adblock.protectionOffHint')
            )}
          </p>
        </div>

        <Switch checked={enabled} onCheckedChange={onToggle} aria-label={t('settings.adblockEnabled')} />
      </div>
    </div>
  )
}
