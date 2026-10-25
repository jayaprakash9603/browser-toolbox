import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { OptionSwitch } from '@/shared/components/toolkit'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { downloadText } from './labels'
import {
  EXPORT_EXTENSIONS,
  EXPORT_FORMATS,
  VALUE_FORMATS,
  buildExport,
  type ExportFormat,
  type Swatch,
  type ValueFormat,
} from './paletteModel'
import { ChipGroup } from './parts'

const MIME: Record<ExportFormat, string> = {
  css: 'text/css',
  tailwind4: 'text/css',
  tailwind3: 'text/javascript',
  scss: 'text/x-scss',
  json: 'application/json',
  tokens: 'application/json',
  svg: 'image/svg+xml',
}

export function ExportPanel({ swatches }: { swatches: Swatch[] }) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<ExportFormat>('css')
  const [value, setValue] = useState<ValueFormat>('hex')
  const [scales, setScales] = useState(false)
  const palette = swatches.map((s) => s.hex).join(',')
  const code = useMemo(() => buildExport(palette.split(','), { format, value, scales }), [palette, format, value, scales])
  const isSvg = format === 'svg'

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-xs @[480px]:p-4">
      <div>
        <h2 className="text-sm font-semibold">{t('pg.export.title')}</h2>
        <p className="text-[11px] text-muted-foreground">{t('pg.export.hint')}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{t('pg.export.format')}</span>
        <ChipGroup
          label={t('pg.export.format')}
          layoutId="pg-export-format"
          value={format}
          onChange={setFormat}
          options={EXPORT_FORMATS.map((option) => ({ value: option, label: t(`pg.export.formats.${option}`) }))}
        />
      </div>
      <div className="grid gap-2 @[480px]:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">{t('pg.export.values')}</span>
          <ChipGroup
            label={t('pg.export.values')}
            layoutId="pg-export-value"
            value={value}
            onChange={setValue}
            disabled={isSvg}
            options={VALUE_FORMATS.map((option) => ({ value: option, label: option.toUpperCase() }))}
          />
        </div>
        <OptionSwitch label={t('pg.export.scales')} hint={t('pg.export.scalesHint')} checked={scales && !isSvg} onChange={setScales} disabled={isSvg} />
      </div>
      <div className="relative overflow-hidden rounded-xl border bg-muted/40">
        <div className="flex items-center justify-between gap-2 border-b bg-background/60 px-2.5 py-1">
          <span className="font-mono text-[10px] text-muted-foreground">palette.{EXPORT_EXTENSIONS[format]}</span>
          <div className="flex items-center gap-1">
            <CopyButton text={code} size="xs" />
            <Button
              variant="ghost"
              size="xs"
              onClick={() => downloadText(code, `palette.${EXPORT_EXTENSIONS[format]}`, MIME[format])}
            >
              <DownloadIcon /> {t('pg.export.download')}
            </Button>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.pre
            key={`${format}-${value}-${scales}`}
            initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="max-h-72 scrollbar-both p-3 font-mono text-[11px] leading-relaxed"
            aria-label={t('pg.export.code')}
            tabIndex={0}
          >
            {code}
          </motion.pre>
        </AnimatePresence>
      </div>
    </section>
  )
}
