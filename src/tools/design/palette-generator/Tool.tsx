import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { generatePalette, parseColor, rgbToHex, type PaletteMode } from '@/core/engines/color'
import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { ToolActions } from '@/tools/text/_shared'
import { useDesignTool } from '../_shared'

const MODES: PaletteMode[] = ['complementary', 'analogous', 'triadic', 'monochromatic', 'random']
const EXAMPLE = '#3B82F6'

export default function PaletteGeneratorTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.palette-generator')
  const [input, setInput] = useState(EXAMPLE)
  const [mode, setMode] = useState<PaletteMode>('analogous')
  const [randomSeed, setRandomSeed] = useState(0)

  const rgb = useMemo(() => parseColor(input), [input])
  const palette = useMemo(
    () => (rgb.ok ? generatePalette(rgb.value, mode, () => 0.5) : []),
    // randomSeed re-triggers random palettes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rgb, mode, randomSeed],
  )

  const exportText = palette.map((c, i) => `--color-${mode}-${i + 1}: ${rgbToHex(c)};`).join('\n')

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={EXAMPLE} aria-label={t('design.colorInput')} className="flex-1 font-mono" />
          <input type="color" value={rgb.ok ? rgbToHex(rgb.value) : '#000000'} onChange={(e) => setInput(e.target.value)} className="size-9 cursor-pointer rounded border" aria-label={t('design.colorInput')} />
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as PaletteMode)}>
          <TabsList className="flex-wrap">
            {MODES.map((m) => <TabsTrigger key={m} value={m}>{t(`design.mode.${m}`)}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        {mode === 'random' && (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setRandomSeed((s) => s + 1)}>{t('text.generate')}</Button>
        )}
        {palette.length > 0 && (
          <>
            <div className="flex gap-1.5">
              {palette.map((color, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <div className="h-14 w-full rounded-md border border-black/10 dark:border-white/10" style={{ backgroundColor: rgbToHex(color) }} />
                  <code className="font-mono text-[9px]">{rgbToHex(color)}</code>
                  <CopyButton text={rgbToHex(color)} />
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium">{t('design.exportCss')}</span>
                <ToolActions value={exportText} onClear={() => setInput(EXAMPLE)} />
              </div>
              <pre className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-[10px]">{exportText}</pre>
            </div>
          </>
        )}
      </div>
    </ToolPage>
  )
}
