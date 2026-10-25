import { useState } from 'react'
import { motion } from 'motion/react'
import { BellIcon, MoonIcon, SearchIcon, SparklesIcon, SunIcon, TriangleAlertIcon, ZapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EASE_OUT } from './labels'
import { neutralScale, ratioBetween, textOn, type Swatch } from './paletteModel'
import { ChipGroup } from './parts'

type Scheme = 'light' | 'dark'

const BARS = [0.55, 0.8, 0.42, 0.95, 0.68, 0.5, 0.86]

/** Picks the palette color itself when it reads on the surface, otherwise the scheme's text color. */
function readableOn(hex: string, surface: string, fallback: string) {
  return ratioBetween(hex, surface) >= 4.5 ? hex : fallback
}

export function PreviewPanel({ swatches }: { swatches: Swatch[] }) {
  const { t } = useTranslation()
  const [scheme, setScheme] = useState<Scheme>('light')
  const hexes = swatches.map((s) => s.hex)
  const [primary, secondary = primary, accent = secondary, highlight = accent] = hexes
  const neutral = neutralScale(primary)
  const n = (step: number) => neutral.find((s) => s.step === step)!.hex
  const dark = scheme === 'dark'

  const page = dark ? n(950) : n(50)
  const surface = dark ? n(900) : '#ffffff'
  const border = dark ? n(800) : n(200)
  const text = dark ? n(50) : n(900)
  const muted = dark ? n(400) : n(500)
  const onPrimary = textOn(primary)
  const onAccent = textOn(accent).hex
  const link = readableOn(secondary, surface, text)
  const transition = 'background-color 400ms, color 400ms, border-color 400ms'

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('pg.preview.title')}</h2>
          <p className="text-[11px] text-muted-foreground">{t('pg.preview.hint')}</p>
        </div>
        <ChipGroup
          label={t('pg.preview.scheme')}
          layoutId="pg-preview-scheme"
          value={scheme}
          onChange={setScheme}
          options={[
            { value: 'light', label: t('pg.preview.light'), icon: <SunIcon /> },
            { value: 'dark', label: t('pg.preview.dark'), icon: <MoonIcon /> },
          ]}
        />
      </div>

      {onPrimary.ratio < 4.5 && (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
          <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
          {t('pg.preview.lowContrast', { ratio: onPrimary.ratio.toFixed(2) })}
        </p>
      )}

      <div
        className="overflow-hidden rounded-xl border text-left shadow-sm"
        style={{ backgroundColor: page, borderColor: border, color: text, transition }}
        role="img"
        aria-label={t('pg.preview.mockLabel')}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ backgroundColor: surface, borderColor: border, transition }}>
          <span className="flex size-6 items-center justify-center rounded-md" style={{ backgroundColor: primary, color: onPrimary.hex, transition }}>
            <ZapIcon className="size-3.5" aria-hidden />
          </span>
          <span className="text-xs font-semibold">Acme</span>
          <span className="ml-3 hidden gap-3 text-[11px] @[440px]:flex" style={{ color: muted }}>
            <span style={{ color: text }}>{t('pg.preview.navHome')}</span>
            <span>{t('pg.preview.navReports')}</span>
            <span>{t('pg.preview.navTeam')}</span>
          </span>
          <span className="ml-auto flex items-center gap-2" style={{ color: muted }}>
            <SearchIcon className="size-3.5" aria-hidden />
            <BellIcon className="size-3.5" aria-hidden />
            <span className="size-5 rounded-full" style={{ backgroundColor: accent, transition }} />
          </span>
        </div>

        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ backgroundColor: surface, borderColor: border, transition }}>
            <span
              className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: accent, color: onAccent, transition }}
            >
              <SparklesIcon className="size-3" aria-hidden />
              {t('pg.preview.badge')}
            </span>
            <p className="text-base leading-tight font-bold tracking-tight">{t('pg.preview.heading')}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: muted }}>
              {t('pg.preview.body')}{' '}
              <span className="font-medium underline underline-offset-2" style={{ color: link }}>
                {t('pg.preview.link')}
              </span>
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-md px-3 py-1.5 text-[11px] font-semibold shadow-sm" style={{ backgroundColor: primary, color: onPrimary.hex, transition }}>
                {t('pg.preview.primaryAction')}
              </span>
              <span
                className="rounded-md border px-3 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: secondary, color: readableOn(secondary, surface, text), transition }}
              >
                {t('pg.preview.secondaryAction')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[primary, secondary, highlight].map((hex, index) => (
              <div key={index} className="flex flex-col gap-1 rounded-lg border p-2" style={{ backgroundColor: surface, borderColor: border, transition }}>
                <span className="text-[9px] uppercase" style={{ color: muted }}>
                  {t(`pg.preview.stat${index + 1}`)}
                </span>
                <span className="text-sm font-bold tabular-nums">{['2.4k', '87%', '+12'][index]}</span>
                <span className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: border }}>
                  <motion.span
                    className="block h-full origin-left rounded-full"
                    style={{ backgroundColor: hex }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: [0.62, 0.87, 0.45][index] }}
                    transition={{ delay: 0.15 + index * 0.08, duration: 0.7, ease: EASE_OUT }}
                  />
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-1.5 rounded-lg border p-3" style={{ backgroundColor: surface, borderColor: border, transition }}>
            {BARS.map((height, index) => (
              <motion.span
                key={`${index}-${hexes.join('')}`}
                className="h-20 flex-1 origin-bottom rounded-t-md"
                style={{ backgroundColor: hexes[index % hexes.length] }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: height }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 160, damping: 18 }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ backgroundColor: surface, borderColor: border, transition }}>
            <span className="h-4 w-7 rounded-full p-0.5" style={{ backgroundColor: primary, transition }}>
              <span className="ml-auto block size-3 rounded-full" style={{ backgroundColor: onPrimary.hex }} />
            </span>
            <span className="text-[11px]">{t('pg.preview.toggle')}</span>
            <span className="ml-auto h-6 w-24 rounded-md border px-2 text-[10px] leading-6" style={{ borderColor: border, color: muted }}>
              {t('pg.preview.input')}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
