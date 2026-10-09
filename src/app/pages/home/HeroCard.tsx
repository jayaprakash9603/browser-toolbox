import {
  BracesIcon,
  CalculatorIcon,
  ClipboardIcon,
  SparklesIcon,
  TypeIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { SlideUp } from '@/shared/components/motion'

const FLOAT_ICONS = [
  { Icon: ClipboardIcon, className: 'top-3 right-4 hero-float-icon' },
  { Icon: BracesIcon, className: 'bottom-6 right-10 hero-float-icon hero-float-icon-delay-1' },
  { Icon: TypeIcon, className: 'top-8 left-6 hero-float-icon hero-float-icon-delay-2' },
  { Icon: CalculatorIcon, className: 'bottom-4 left-10 hero-float-icon hero-float-icon-delay-3' },
  { Icon: SparklesIcon, className: 'top-1/2 right-1/3 hero-float-icon hero-float-icon-delay-4' },
]

export function HeroCard() {
  const { t } = useTranslation()

  const scrollToCategories = () => {
    document.getElementById('all-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <SlideUp className="relative mb-4 overflow-hidden rounded-2xl border-0 p-4 text-white shadow-[var(--shadow-card-hover)]">
      <div
        className="absolute inset-0 bg-gradient-to-br from-[var(--hero-from)] via-[var(--hero-via)] to-[var(--hero-to)]"
        aria-hidden
      />
      <div className="relative z-10">
        <h1 className="text-product-title mb-1.5 max-w-[16rem] text-white">{t('home.heroTitle')}</h1>
        <p className="mb-3 max-w-[18rem] text-[13px] leading-relaxed text-white/90">
          {t('home.heroSubtitle')}
        </p>
        <Button
          type="button"
          size="sm"
          className="bg-white text-[var(--hero-from)] hover:bg-white/90"
          onClick={scrollToCategories}
        >
          {t('home.exploreTools')}
        </Button>
      </div>
      {FLOAT_ICONS.map(({ Icon, className }) => (
        <Icon
          key={className}
          className={`pointer-events-none absolute size-5 text-white/25 ${className}`}
          aria-hidden
        />
      ))}
    </SlideUp>
  )
}
