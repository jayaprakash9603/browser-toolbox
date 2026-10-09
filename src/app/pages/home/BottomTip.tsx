import { LightbulbIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FadeIn } from '@/shared/components/motion'

const TIP_KEYS = ['home.tip.ctrlK', 'home.tip.favorites', 'home.tip.palette'] as const

export function BottomTip({ delay = 0.66 }: { delay?: number }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % TIP_KEYS.length)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <FadeIn delay={delay} className="mb-2">
      <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2.5">
        <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('home.tip.title')}
          </p>
          <p className="text-tool-desc">{t(TIP_KEYS[index])}</p>
        </div>
      </div>
    </FadeIn>
  )
}
