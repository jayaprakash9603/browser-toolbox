import { SparklesIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { getGreetingKey } from '@/app/pages/home/homeConfig'
import { SlideUp } from '@/shared/components/motion'

export function WelcomeStrip({ favoriteCount, delay = 0 }: { favoriteCount: number; delay?: number }) {
  const { t } = useTranslation()
  const greetingKey = useMemo(() => getGreetingKey(), [])
  const stats = useMemo(() => {
    const toolCount = toolRegistry.getAll().length
    const categoryCount = categoryRegistry
      .getEnabled()
      .filter((category) => toolRegistry.getByCategory(category.id).length > 0).length
    return { toolCount, categoryCount }
  }, [])

  const items = [
    { label: t('home.stat.tools'), value: stats.toolCount },
    { label: t('home.stat.categories'), value: stats.categoryCount },
    { label: t('home.stat.favorites'), value: favoriteCount },
  ]

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <section
        aria-labelledby="home-welcome-title"
        className="relative overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)]"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--hero-from) 16%, var(--card)) 0%, color-mix(in srgb, var(--hero-to) 8%, var(--card)) 55%, var(--card) 100%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full opacity-25 blur-2xl"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
        />
        <div className="relative flex items-start gap-2.5">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
          >
            <SparklesIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h1 id="home-welcome-title" className="text-[15px] leading-tight font-semibold tracking-tight">
              {t(greetingKey)}
            </h1>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {t('home.welcomeSubtitle')}
            </p>
          </div>
        </div>
        <dl className="relative mt-2.5 grid grid-cols-3 divide-x rounded-xl border bg-background/60 backdrop-blur-sm">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col-reverse items-center px-1 py-1.5">
              <dt className="max-w-full truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {item.label}
              </dt>
              <dd className="text-base leading-tight font-bold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SlideUp>
  )
}
