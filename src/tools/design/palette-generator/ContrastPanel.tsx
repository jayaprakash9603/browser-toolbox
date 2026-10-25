import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon, CircleCheckIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { VisionMode } from '@/core/engines/color'
import { cn } from '@/shared/utils/cn'
import { EASE_OUT, useColorLabels } from './labels'
import { DARK_TEXT, LIGHT_TEXT, VISION_MODES, confusablePairs, ratioBetween, simulateHex, type Swatch } from './paletteModel'
import { ChipGroup } from './parts'

const THRESHOLDS = { aa: 4.5, aaa: 7, large: 3 } as const
type Threshold = keyof typeof THRESHOLDS

export function ContrastPanel({ swatches }: { swatches: Swatch[] }) {
  const { t } = useTranslation()
  const labels = useColorLabels()
  const [threshold, setThreshold] = useState<Threshold>('aa')
  const [vision, setVision] = useState<VisionMode>('normal')
  const min = THRESHOLDS[threshold]

  const foregrounds = [
    ...swatches.map((swatch, index) => ({ key: swatch.id, hex: swatch.hex, label: labels.role(index) })),
    { key: 'white', hex: LIGHT_TEXT, label: t('pg.contrast.white') },
    { key: 'black', hex: DARK_TEXT, label: t('pg.contrast.black') },
  ]

  let passing = 0
  let total = 0
  for (const bg of swatches) {
    for (const fg of foregrounds) {
      if (fg.key === bg.id) continue
      total += 1
      if (ratioBetween(fg.hex, bg.hex) >= min) passing += 1
    }
  }
  const share = total ? passing / total : 0
  const pairs = confusablePairs(
    swatches.map((s) => s.hex),
    vision,
  )

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
        <div className="flex items-center gap-3">
          <PassRing share={share} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">{t('pg.contrast.title')}</h2>
            <p className="text-[11px] text-muted-foreground" aria-live="polite">
              {t('pg.contrast.summary', { passing, total, level: t(`pg.contrast.levels.${threshold}`) })}
            </p>
          </div>
        </div>
        <ChipGroup
          label={t('pg.contrast.levelLabel')}
          layoutId="pg-contrast-level"
          value={threshold}
          onChange={setThreshold}
          options={(Object.keys(THRESHOLDS) as Threshold[]).map((value) => ({
            value,
            label: t(`pg.contrast.levels.${value}`),
            title: t(`pg.contrast.levels.${value}Hint`),
          }))}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] table-fixed border-separate border-spacing-1">
            <caption className="sr-only">{t('pg.contrast.caption')}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[4.25rem] text-left text-[9px] leading-tight font-medium text-muted-foreground">
                  {t('pg.contrast.axis')}
                </th>
                {foregrounds.map((fg) => (
                  <th key={fg.key} scope="col" className="p-0">
                    <span className="sr-only">{fg.label}</span>
                    <span
                      className="mx-auto block size-4 rounded-full border border-black/15 dark:border-white/20"
                      style={{ backgroundColor: fg.hex }}
                      title={fg.label}
                      aria-hidden
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {swatches.map((bg, rowIndex) => (
                <tr key={bg.id}>
                  <th scope="row" className="truncate text-left text-[10px] font-medium">
                    {labels.role(rowIndex)}
                  </th>
                  {foregrounds.map((fg) => {
                    if (fg.key === bg.id) {
                      return (
                        <td key={fg.key} className="h-9 rounded-md bg-muted/50 text-center text-[10px] text-muted-foreground">
                          <span aria-hidden>—</span>
                        </td>
                      )
                    }
                    const ratio = ratioBetween(fg.hex, bg.hex)
                    const ok = ratio >= min
                    return (
                      <td key={fg.key} className="p-0">
                        <motion.div
                          className={cn(
                            'relative flex h-9 flex-col items-center justify-center rounded-md transition-opacity duration-300',
                            !ok && 'opacity-35',
                          )}
                          initial={false}
                          animate={{ backgroundColor: bg.hex, color: fg.hex }}
                          transition={{ duration: 0.4, ease: EASE_OUT }}
                          title={t('pg.contrast.cell', { fg: fg.label, bg: labels.role(rowIndex), ratio: ratio.toFixed(2) })}
                        >
                          <span className="text-[11px] leading-none font-bold tabular-nums">{ratio.toFixed(1)}</span>
                          {ok ? (
                            <CheckIcon className="mt-0.5 size-2.5" aria-hidden />
                          ) : (
                            <XIcon className="mt-0.5 size-2.5" aria-hidden />
                          )}
                          <span className="sr-only">
                            {t('pg.contrast.cell', { fg: fg.label, bg: labels.role(rowIndex), ratio: ratio.toFixed(2) })}{' '}
                            {ok ? t('pg.contrast.pass') : t('pg.contrast.fail')}
                          </span>
                        </motion.div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground">{t('pg.contrast.legend')}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
        <div>
          <h2 className="text-sm font-semibold">{t('pg.vision.title')}</h2>
          <p className="text-[11px] text-muted-foreground text-pretty">{t('pg.vision.hint')}</p>
        </div>
        <ChipGroup
          label={t('pg.vision.title')}
          layoutId="pg-vision"
          value={vision}
          onChange={setVision}
          options={VISION_MODES.map((value) => ({ value, label: t(`pg.vision.${value}`), title: t(`pg.vision.${value}Hint`) }))}
        />
        <div className="flex h-16 gap-1 overflow-hidden rounded-xl" role="img" aria-label={t('pg.vision.stripLabel', { mode: t(`pg.vision.${vision}`) })}>
          {swatches.map((swatch, index) => (
            <motion.div
              key={swatch.id}
              className="flex-1 first:rounded-l-xl last:rounded-r-xl"
              initial={false}
              animate={{ backgroundColor: simulateHex(swatch.hex, vision) }}
              transition={{ duration: 0.5, delay: index * 0.04, ease: EASE_OUT }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${vision}-${pairs.map((p) => p.join(':')).join(',')}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            {pairs.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CircleCheckIcon className="size-3.5 shrink-0" aria-hidden />
                {t('pg.vision.allClear')}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {pairs.map(([a, b]) => (
                  <li key={`${a}-${b}`} className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
                    {t('pg.vision.confusable', { a: labels.role(a), b: labels.role(b) })}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  )
}

function PassRing({ share }: { share: number }) {
  const radius = 18
  return (
    <svg viewBox="0 0 44 44" className="size-12 shrink-0 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="5" />
      <motion.circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: Math.max(0.001, share) }}
        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
      />
      <text x="22" y="22" dy="0.35em" textAnchor="middle" className="rotate-90 fill-foreground text-[10px] font-bold" style={{ transformOrigin: '22px 22px' }}>
        {Math.round(share * 100)}%
      </text>
    </svg>
  )
}
