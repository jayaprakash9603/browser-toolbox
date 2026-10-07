import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { parseColor, rgbToHex, rgbToHsl, rgbToHsv, rgbToHwb, rgbToCmyk } from '@/core/engines/color'
import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { Swatch, useDesignTool } from '../_shared'

const EXAMPLE = '#3B82F6'

export default function ColorConverterTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.color-converter')
  const [input, setInput] = useState('')

  const parsed = useMemo(() => (input.trim() ? parseColor(input) : null), [input])
  const rgb = parsed?.ok ? parsed.value : null

  const rows = useMemo(() => {
    if (!rgb) return []
    const hsl = rgbToHsl(rgb)
    const hsv = rgbToHsv(rgb)
    const hwb = rgbToHwb(rgb)
    const cmyk = rgbToCmyk(rgb)
    return [
      { label: 'HEX', value: rgbToHex(rgb) },
      { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
      { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
      { label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
      { label: 'HWB', value: `hwb(${hwb.h} ${hwb.w}% ${hwb.b}%)` },
      { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
    ]
  }, [rgb])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {rgb && <Swatch color={rgb} size="lg" />}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={EXAMPLE}
            aria-label={t('design.colorInput')}
            className="flex-1 font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => setInput(EXAMPLE)}
          className="w-fit text-[11px] text-primary hover:underline"
        >
          {t('dev.tryExample')}
        </button>
        {parsed && !parsed.ok && <JsonErrorView message={parsed.error} />}
        {rows.length > 0 && (
          <div className="space-y-1">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2 rounded border bg-muted/40 px-2 py-1.5"
              >
                <span className="w-12 text-[10px] font-medium text-muted-foreground">
                  {row.label}
                </span>
                <code className="min-w-0 flex-1 font-mono text-[11px]">{row.value}</code>
                <CopyButton text={row.value} />
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
