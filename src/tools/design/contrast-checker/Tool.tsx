import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { checkContrast, parseColor, rgbToHex } from '@/core/engines/color'
import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { CopyButton } from '@/shared/components/CopyButton'
import { Swatch, useDesignTool } from '../_shared'

export default function ContrastCheckerTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.contrast-checker')
  const [fgInput, setFgInput] = useState('#1e293b')
  const [bgInput, setBgInput] = useState('#ffffff')

  const fg = useMemo(() => parseColor(fgInput), [fgInput])
  const bg = useMemo(() => parseColor(bgInput), [bgInput])
  const result = useMemo(
    () => (fg.ok && bg.ok ? checkContrast(fg.value, bg.value) : null),
    [fg, bg],
  )

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        {(
          [
            ['foreground', fgInput, setFgInput, fg],
            ['background', bgInput, setBgInput, bg],
          ] as const
        ).map(([label, value, set, parsed]) => (
          <div key={label} className="flex items-center gap-2">
            {parsed.ok && <Swatch color={parsed.value} />}
            <Input
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={label === 'foreground' ? '#1e293b' : '#ffffff'}
              aria-label={t(`design.${label}`)}
              className="flex-1 font-mono"
            />
            <input
              type="color"
              value={parsed.ok ? rgbToHex(parsed.value) : '#000000'}
              onChange={(e) => set(e.target.value)}
              className="size-9 cursor-pointer rounded border"
              aria-label={t(`design.${label}`)}
            />
          </div>
        ))}
        {result && (
          <>
            <div
              className="rounded-md border p-3 text-center"
              style={{ backgroundColor: bgInput, color: fgInput }}
            >
              <p className="text-sm font-medium">{t('design.previewText')}</p>
              <p className="text-lg font-bold">{t('design.previewLarge')}</p>
            </div>
            <div className="flex items-center justify-between rounded border bg-muted/40 p-2">
              <span className="text-xs font-medium">{t('design.ratio')}</span>
              <div className="flex items-center gap-1">
                <code className="font-mono text-sm font-semibold">{result.ratio}:1</code>
                <CopyButton text={`${result.ratio}:1`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Verdict label="AA · normal" pass={result.aaNormal} />
              <Verdict label="AA · large" pass={result.aaLarge} />
              <Verdict label="AAA · normal" pass={result.aaaNormal} />
              <Verdict label="AAA · large" pass={result.aaaLarge} />
            </div>
          </>
        )}
      </div>
    </ToolPage>
  )
}

function Verdict({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div
      className={`rounded border p-2 text-center ${pass ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}
    >
      <Badge
        variant="outline"
        className={
          pass
            ? 'border-green-500/40 text-green-700 dark:text-green-400'
            : 'border-red-500/40 text-red-700 dark:text-red-400'
        }
      >
        {pass ? 'PASS' : 'FAIL'}
      </Badge>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
