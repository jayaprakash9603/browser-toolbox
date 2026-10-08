import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PipetteIcon } from 'lucide-react'

import { parseColor, rgbToHex, rgbToHsl } from '@/core/engines/color'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { Swatch, useDesignTool } from '../_shared'

interface EyeDropperResult {
  sRGBHex: string
}
declare global {
  interface Window {
    EyeDropper?: new () => { open(): Promise<EyeDropperResult> }
  }
}

export default function ColorPickerTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.color-picker')
  const [picked, setPicked] = useState<string | null>(null)
  const [supported] = useState(() => typeof window !== 'undefined' && 'EyeDropper' in window)

  const rgb = useMemo(() => (picked ? parseColor(picked) : null), [picked])
  const value = rgb?.ok ? rgb.value : null

  const pick = async () => {
    if (!window.EyeDropper) return
    try {
      const result = await new window.EyeDropper().open()
      setPicked(result.sRGBHex)
    } catch {
      /* user cancelled */
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        {supported ? (
          <Button size="sm" className="w-fit" onClick={() => void pick()}>
            <PipetteIcon /> {t('design.pickFromScreen')}
          </Button>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            {t('design.noEyedropper')}
          </p>
        )}
        <label className="flex flex-col gap-1 text-xs">
          {t('design.orPick')}
          <input
            type="color"
            onChange={(e) => setPicked(e.target.value)}
            className="h-9 w-full cursor-pointer rounded border"
            aria-label={t('design.orPick')}
          />
        </label>
        {value && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Swatch color={value} size="lg" />
              <code className="font-mono text-sm">{rgbToHex(value)}</code>
            </div>
            {[
              ['HEX', rgbToHex(value)],
              ['RGB', `rgb(${value.r}, ${value.g}, ${value.b})`],
              [
                'HSL',
                (() => {
                  const h = rgbToHsl(value)
                  return `hsl(${h.h}, ${h.s}%, ${h.l}%)`
                })(),
              ],
            ].map(([label, v]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded border bg-muted/40 px-2 py-1.5"
              >
                <span className="w-10 text-[11px] font-medium text-muted-foreground">{label}</span>
                <code className="flex-1 font-mono text-[11px]">{v}</code>
                <CopyButton text={v} />
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
