import { motion, useReducedMotion } from 'motion/react'
import {
  ActivityIcon,
  AlertTriangleIcon,
  CornerDownRightIcon,
  GaugeIcon,
  HashIcon,
  HighlighterIcon,
  ScanSearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { CheckScope, CheckSettings, TargetPlan } from '@/core/engines/linkChecker/report'
import { CHECK_SCOPES, MAX_TARGETS } from '@/core/engines/linkChecker/report'
import type { PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'

import { SiteAvatar } from '../link-toolkit/LinkVisuals'

interface ScanHeroProps {
  snapshot: PageLinksSnapshot
  plan: TargetPlan
  settings: CheckSettings
  onScopeChange: (scope: CheckScope) => void
  onStart: () => void
  onOpenSettings: () => void
}

const FEATURES = [
  { key: 'featureStatus', icon: HashIcon },
  { key: 'featureRedirects', icon: CornerDownRightIcon },
  { key: 'featureSpeed', icon: GaugeIcon },
  { key: 'featureMark', icon: HighlighterIcon },
] as const

export function ScanHero({ snapshot, plan, settings, onScopeChange, onStart, onOpenSettings }: ScanHeroProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const count = plan.targets.length

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-xs"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl"
      />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative flex size-16 items-center justify-center" aria-hidden>
          {!reduce &&
            [0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                initial={{ scale: 0.55, opacity: 0.7 }}
                animate={{ scale: 1.65, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, delay: ring * 0.8, ease: 'easeOut' }}
              />
            ))}
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ScanSearchIcon className="size-6" />
          </span>
        </div>
        <h2 className="mt-4 text-[15px] leading-5 font-semibold tracking-tight text-balance">{t('linkChecker.hero.title')}</h2>
        <p className="mt-1 max-w-80 text-xs leading-relaxed text-pretty text-muted-foreground">{t('linkChecker.hero.subtitle')}</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {FEATURES.map(({ key, icon: Icon }, index) => (
            <motion.li
              key={key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : 0.12 + index * 0.05, ease: 'easeOut' }}
              className="inline-flex h-6 items-center gap-1 rounded-full border bg-background/80 px-2 text-[11px] font-medium text-foreground/80"
            >
              <Icon className="size-3 text-primary" aria-hidden />
              {t(`linkChecker.hero.${key}`)}
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="relative mt-4 space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl border bg-background/70 px-2.5 py-2">
          <SiteAvatar host={snapshot.host} kind="internal" />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] leading-5 font-medium">{snapshot.title || snapshot.host || snapshot.url}</p>
            <p className="truncate text-[11px] text-muted-foreground">{snapshot.host || snapshot.url}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">{t('linkChecker.scopeLabel')}</p>
          <Segmented
            value={settings.scope}
            onValueChange={onScopeChange}
            ariaLabel={t('linkChecker.scopeLabel')}
            className="flex h-9 w-full [&>button]:flex-1"
            options={CHECK_SCOPES.map((scope) => ({
              value: scope,
              label: (
                <>
                  {t(`linkChecker.scope.${scope}`)}
                  <span className="tabular-nums opacity-60">{plan.available[scope].toLocaleString()}</span>
                </>
              ),
            }))}
          />
        </div>

        <Button className="h-10 w-full text-[13px] shadow-md shadow-primary/20" onClick={onStart} disabled={count === 0}>
          <ActivityIcon />
          {count === 0 ? t('linkChecker.nothingToCheck') : t('linkChecker.start', { count })}
        </Button>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate tabular-nums">
            {t('linkChecker.planSummary', {
              method: t(`linkChecker.method.${settings.method}`),
              seconds: settings.timeoutMs / 1000,
              concurrency: settings.concurrency,
            })}
            {plan.skipped > 0 && ` · ${t('linkChecker.skippedCount', { count: plan.skipped })}`}
          </span>
          <Button variant="ghost" size="xs" className="h-6 shrink-0 px-1.5 text-[11px]" onClick={onOpenSettings}>
            <SlidersHorizontalIcon />
            {t('linkChecker.editSettings')}
          </Button>
        </div>

        {plan.capped && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
            {t('linkChecker.capped', { count: MAX_TARGETS })}
          </p>
        )}
        {count === 0 && <p className="text-center text-xs leading-relaxed text-muted-foreground">{t('linkChecker.emptyHint')}</p>}
      </div>
    </motion.section>
  )
}
