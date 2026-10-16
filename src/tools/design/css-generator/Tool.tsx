import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Slider } from '@/shared/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions } from '@/tools/text/_shared'
import { useDesignTool } from '../_shared'

export default function CssGeneratorTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.css-generator')
  const [tab, setTab] = useState<'gradient' | 'shadow' | 'radius' | 'glass'>('gradient')

  const [gradFrom, setGradFrom] = useState('#6366f1')
  const [gradTo, setGradTo] = useState('#ec4899')
  const [gradAngle, setGradAngle] = useState(135)
  const [shadowX, setShadowX] = useState(0)
  const [shadowY, setShadowY] = useState(8)
  const [shadowBlur, setShadowBlur] = useState(24)
  const [shadowColor, setShadowColor] = useState('#000000')
  const shadowAlpha = 0.25
  const [radius, setRadius] = useState(12)
  const [glassBlur, setGlassBlur] = useState(12)
  const glassAlpha = 0.15

  const css = (() => {
    switch (tab) {
      case 'gradient':
        return `background: linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo});`
      case 'shadow':
        return `box-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${hexAlpha(shadowColor, shadowAlpha)};`
      case 'radius':
        return `border-radius: ${radius}px;`
      case 'glass':
        return `background: rgba(255, 255, 255, ${glassAlpha});\nbackdrop-filter: blur(${glassBlur}px);\nborder: 1px solid rgba(255, 255, 255, 0.2);`
    }
  })()

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="gradient">{t('design.cssGradient')}</TabsTrigger>
            <TabsTrigger value="shadow">{t('design.cssShadow')}</TabsTrigger>
            <TabsTrigger value="radius">{t('design.cssRadius')}</TabsTrigger>
            <TabsTrigger value="glass">{t('design.cssGlass')}</TabsTrigger>
          </TabsList>

        <div
          className="rounded-md border p-6"
          style={previewStyle(tab, {
            gradFrom,
            gradTo,
            gradAngle,
            shadowX,
            shadowY,
            shadowBlur,
            shadowColor,
            shadowAlpha,
            radius,
            glassBlur,
            glassAlpha,
          })}
        >
          <div className="rounded bg-background/80 p-3 text-center text-xs text-muted-foreground shadow-sm">
            {t('design.preview')}
          </div>
        </div>

        <TabsContent value="gradient" className="mt-0 flex flex-col gap-2 data-[state=inactive]:hidden">
          <ColorField label={t('design.from')} value={gradFrom} onChange={setGradFrom} />
          <ColorField label={t('design.to')} value={gradTo} onChange={setGradTo} />
          <NumField
            label={t('design.angle')}
            value={gradAngle}
            onChange={setGradAngle}
            min={0}
            max={360}
          />
        </TabsContent>
        <TabsContent value="shadow" className="mt-0 flex flex-col gap-2 data-[state=inactive]:hidden">
          <NumField label="X" value={shadowX} onChange={setShadowX} min={-50} max={50} />
          <NumField label="Y" value={shadowY} onChange={setShadowY} min={-50} max={50} />
          <NumField
            label={t('design.blur')}
            value={shadowBlur}
            onChange={setShadowBlur}
            min={0}
            max={100}
          />
          <ColorField label={t('design.color')} value={shadowColor} onChange={setShadowColor} />
        </TabsContent>
        <TabsContent value="radius" className="mt-0 flex flex-col gap-2 data-[state=inactive]:hidden">
          <NumField
            label={t('design.radius')}
            value={radius}
            onChange={setRadius}
            min={0}
            max={100}
          />
        </TabsContent>
        <TabsContent value="glass" className="mt-0 flex flex-col gap-2 data-[state=inactive]:hidden">
          <NumField
            label={t('design.blur')}
            value={glassBlur}
            onChange={setGlassBlur}
            min={0}
            max={40}
          />
        </TabsContent>
        </Tabs>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium">CSS</span>
            <ToolActions value={css} onClear={() => undefined} />
          </div>
          <pre className="scrollbar-both rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
            {css}
          </pre>
        </div>
      </div>
    </ToolPage>
  )
}

function hexAlpha(hex: string, alpha: number): string {
  const alphaHex = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${alphaHex}`
}

function previewStyle(tab: string, s: Record<string, number | string>): React.CSSProperties {
  switch (tab) {
    case 'gradient':
      return { background: `linear-gradient(${s.gradAngle}deg, ${s.gradFrom}, ${s.gradTo})` }
    case 'shadow':
      return {
        boxShadow: `${s.shadowX}px ${s.shadowY}px ${s.shadowBlur}px ${hexAlpha(String(s.shadowColor), Number(s.shadowAlpha))}`,
      }
    case 'radius':
      return { borderRadius: `${s.radius}px`, background: 'hsl(var(--accent))' }
    case 'glass':
      return {
        background: `rgba(255,255,255,${s.glassAlpha})`,
        backdropFilter: `blur(${s.glassBlur}px)`,
      }
    default:
      return {}
  }
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-9 cursor-pointer rounded border"
        aria-label={label}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono"
        aria-label={label}
      />
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-16">{label}</span>
      <Slider
        min={min}
        max={max}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        className="flex-1"
        aria-label={label}
      />
      <code className="w-10 text-right font-mono text-[11px]">{value}</code>
    </label>
  )
}
