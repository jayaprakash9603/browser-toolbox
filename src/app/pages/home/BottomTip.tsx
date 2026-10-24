import { LightbulbIcon, RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FadeIn } from '@/shared/components/motion'

const TIP_KEYS = ['home.tip.ctrlK', 'home.tip.favorites', 'home.tip.categories', 'home.tip.palette'] as const

export function BottomTip({ delay = 0.36 }: { delay?: number }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)

  return (
    <FadeIn delay={delay} className="mb-2">
      <div className="flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 py-1.5 pr-1.5 pl-3">
        <LightbulbIcon className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-xs leading-snug text-foreground/80" aria-live="polite">
          <span className="font-semibold text-primary">{t('home.tip.title')}: </span>
          {t(TIP_KEYS[index])}
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % TIP_KEYS.length)}
          aria-label={t('home.tip.next')}
          title={t('home.tip.next')}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCwIcon className="size-3.5" aria-hidden />
        </button>
      </div>
    </FadeIn>
  )
}
