import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/shared/components/CopyButton'
import { EASE_OUT, useColorLabels } from './labels'
import { SCALE_STEPS, buildScale, neutralScale, roleKey, textOn, type ScaleColor, type Swatch } from './paletteModel'

export function ScalesPanel({ swatches }: { swatches: Swatch[] }) {
  const { t } = useTranslation()
  const labels = useColorLabels()
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 1100)
    return () => clearTimeout(timer)
  }, [copied])

  const rows: { key: string; token: string; label: string; scale: ScaleColor[] }[] = [
    ...swatches.map((swatch, index) => ({ key: swatch.id, token: roleKey(index), label: labels.role(index), scale: buildScale(swatch.hex) })),
    { key: 'neutral', token: 'neutral', label: t('pg.scales.neutral'), scale: neutralScale(swatches[0].hex) },
  ]

  const copy = async (hex: string, key: string) => {
    await navigator.clipboard.writeText(hex)
    setCopied(key)
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
      <div>
        <h2 className="text-sm font-semibold">{t('pg.scales.title')}</h2>
        <p className="text-[11px] text-muted-foreground text-pretty">{t('pg.scales.hint')}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[4.5rem_repeat(11,minmax(0,1fr))_1.75rem] gap-0.5 @[520px]:grid-cols-[5.5rem_repeat(11,minmax(0,1fr))_1.75rem] @[520px]:gap-1 font-mono text-[9px] text-muted-foreground" aria-hidden>
          <span />
          {SCALE_STEPS.map((step) => (
            <span key={step} className="text-center">
              {step}
            </span>
          ))}
          <span />
        </div>
        {rows.map((row, rowIndex) => (
          <motion.div
            key={row.key}
            className="grid grid-cols-[4.5rem_repeat(11,minmax(0,1fr))_1.75rem] items-center gap-0.5 @[520px]:grid-cols-[5.5rem_repeat(11,minmax(0,1fr))_1.75rem] @[520px]:gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rowIndex * 0.05, duration: 0.35, ease: EASE_OUT }}
          >
            <span className="truncate text-[11px] font-medium">{row.label}</span>
            {row.scale.map((step) => {
              const key = `${row.key}-${step.step}`
              return (
                <motion.button
                  key={step.step}
                  type="button"
                  onClick={() => void copy(step.hex, key)}
                  aria-label={t('pg.scales.copyStep', { name: row.label, step: step.step, hex: step.hex })}
                  title={`${row.token}-${step.step} · ${step.hex}`}
                  className="relative flex h-9 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring"
                  initial={false}
                  animate={{ backgroundColor: step.hex }}
                  whileHover={{ scale: 1.14, zIndex: 10 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ backgroundColor: { duration: 0.4, ease: EASE_OUT }, scale: { type: 'spring', stiffness: 500, damping: 28 } }}
                  style={{ color: textOn(step.hex).hex }}
                >
                  <AnimatePresence>
                    {copied === key ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                        className="flex"
                      >
                        <CheckIcon className="size-3.5" aria-hidden />
                      </motion.span>
                    ) : (
                      step.isBase && <span key="base" className="size-1.5 rounded-full bg-current" aria-hidden />
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
            <CopyButton
              text={row.scale.map((step) => `--color-${row.token}-${step.step}: ${step.hex};`).join('\n')}
              label={t('pg.scales.copyRow', { name: row.label })}
            />
          </motion.div>
        ))}
      </div>
      <span role="status" className="sr-only">
        {copied ? t('common.copied') : ''}
      </span>
    </section>
  )
}
