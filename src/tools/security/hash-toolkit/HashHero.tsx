import { motion, useReducedMotion } from 'motion/react'
import {
  BadgeCheckIcon,
  FileDiffIcon,
  FingerprintIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const FEATURES = [
  { key: 'featureDigests', icon: FingerprintIcon },
  { key: 'featureVerify', icon: BadgeCheckIcon },
  { key: 'featureCompare', icon: FileDiffIcon },
  { key: 'featureEvidence', icon: ShieldCheckIcon },
] as const

export function HashHero() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-xs"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative flex size-16 items-center justify-center" aria-hidden>
          {!reduce &&
            [0, 1].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-full border-2 border-emerald-500/35"
                initial={{ scale: 0.6, opacity: 0.65 }}
                animate={{ scale: 1.55, opacity: 0 }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: ring * 0.85,
                  ease: 'easeOut',
                }}
              />
            ))}
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 dark:bg-emerald-500">
            <ScaleIcon className="size-6" />
          </span>
        </div>
        <h2 className="mt-3 text-[15px] font-semibold tracking-tight text-balance">
          {t('hashToolkit.hero.title')}
        </h2>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-pretty text-muted-foreground">
          {t('hashToolkit.hero.subtitle')}
        </p>
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {FEATURES.map(({ key, icon: Icon }, index) => (
            <motion.li
              key={key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: reduce ? 0 : 0.08 + index * 0.05 }}
              className="inline-flex h-6 items-center gap-1 rounded-full border bg-background/80 px-2 text-[11px] font-medium text-foreground/85"
            >
              <Icon className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {t(`hashToolkit.hero.${key}`)}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  )
}
