import { ActivityIcon, BellRingIcon, PowerIcon, WifiIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

const POINTS = [
  { icon: WifiIcon, key: 'netmon.off.point1' },
  { icon: ActivityIcon, key: 'netmon.off.point2' },
  { icon: BellRingIcon, key: 'netmon.off.point3' },
]

export function MonitorOffCard({ onEnable }: { onEnable: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-xs"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_60%)]"
      />
      <div className="relative flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PowerIcon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] leading-tight font-semibold">{t('netmon.off.title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('netmon.off.body')}</p>
        </div>
      </div>
      <ul className="relative mt-3 grid gap-1.5 @[480px]:grid-cols-3">
        {POINTS.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2 text-xs">
            <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>
      <Button className="relative mt-3 w-full" onClick={onEnable}>
        <PowerIcon className="size-4" aria-hidden />
        {t('netmon.off.cta')}
      </Button>
    </motion.section>
  )
}
