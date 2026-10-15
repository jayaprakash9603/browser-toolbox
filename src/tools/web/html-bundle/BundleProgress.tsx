import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FileArchiveIcon, FileCodeIcon, FileTextIcon, ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STEP_KEYS = [
  'htmlBundle.stepPages',
  'htmlBundle.stepAssets',
  'htmlBundle.stepCompress',
] as const

const FLYING_ICONS = [FileTextIcon, FileCodeIcon, ImageIcon]

interface BundleProgressProps {
  active: boolean
  pageCount: number
}

export function BundleProgress({ active, pageCount }: BundleProgressProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) return undefined
    setStep(0)
    setElapsed(0)
    const started = Date.now()
    const stepTimer = window.setInterval(
      () => setStep((current) => Math.min(current + 1, STEP_KEYS.length - 1)),
      2200,
    )
    const clock = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => {
      window.clearInterval(stepTimer)
      window.clearInterval(clock)
    }
  }, [active])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center">
              {!reduce &&
                FLYING_ICONS.map((Icon, index) => (
                  <motion.span
                    key={index}
                    className="absolute text-primary/70"
                    initial={{ x: -18, y: -14 + index * 14, opacity: 0, scale: 0.6 }}
                    animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [0.6, 0.9, 0.4] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      delay: index * 0.45,
                      ease: 'easeInOut',
                    }}
                    aria-hidden
                  >
                    <Icon className="size-3.5" />
                  </motion.span>
                ))}
              <motion.span
                className="relative flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                <FileArchiveIcon className="size-4.5" />
              </motion.span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold">
                  {t('htmlBundle.preparing', { count: pageCount })}
                </p>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {elapsed}s
                </span>
              </div>
              <div className="relative h-4 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={step}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-x-0 truncate text-[11px] text-muted-foreground"
                  >
                    {t(STEP_KEYS[step])}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-primary/15">
            <motion.div
              className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
              initial={{ x: '-100%' }}
              animate={reduce ? { x: '75%' } : { x: ['-100%', '250%'] }}
              transition={reduce ? { duration: 0 } : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
