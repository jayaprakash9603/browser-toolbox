import { useEffect, useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { useTranslation } from 'react-i18next'
import { BarcodeIcon, PenLineIcon, QrCodeIcon, ScanLineIcon } from 'lucide-react'
import { MotionConfig } from 'motion/react'

import { createQrMatrix, type ParsedQrContent, type QrMatrix, type QrPreset } from '@/core/engines/qrcode'
import type { BarcodeFormat } from '@/core/engines/barcode'
import { useDeepLinkParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { ToolPage } from '@/shared/components/ToolPage'
import { SectionCard } from '@/shared/components/ValueCard'
import { ModeTiles } from '@/shared/components/toolkit'
import { SlideUp } from '@/shared/components/motion'
import { TabsContent } from '@/shared/components/ui/tabs'

import { useGeneratorTool } from '../_shared'
import { BarcodePanel } from './BarcodePanel'
import { BarcodeStage } from './BarcodeStage'
import { ContentFields, PresetPicker } from './ContentFields'
import { DecodePanel } from './DecodePanel'
import { DesignPanel } from './DesignPanel'
import { QrStage } from './QrStage'
import { BARCODE_SAMPLES, loadBarcodeStyle, saveBarcodeStyle } from './barcodeModel'
import {
  EMPTY_FORM,
  PRESETS,
  buildQrPayload,
  loadStyle,
  parsedToForm,
  saveStyle,
  type QrForm,
  type QrStyle,
} from './qrModel'

const MODES = ['generate', 'decode', 'barcode'] as const
type ToolkitMode = (typeof MODES)[number]

const MODE_META = {
  generate: { icon: QrCodeIcon, tone: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
  decode: { icon: ScanLineIcon, tone: 'bg-sky-500/12 text-sky-700 dark:text-sky-300' },
  barcode: { icon: BarcodeIcon, tone: 'bg-amber-500/14 text-amber-800 dark:text-amber-300' },
} as const

const RESHAPE_KEYS: (keyof QrStyle)[] = ['moduleShape', 'eyeShape', 'margin']

export default function QrToolkitTool() {
  const { t } = useTranslation()
  const tool = useGeneratorTool('generators.qr-toolkit')
  const [mode, setMode] = useDeepLinkTab<ToolkitMode>('tab', MODES, 'generate')
  const [preset, setPreset] = useDeepLinkParam('preset', PRESETS, 'text')
  const [form, setForm] = useState<QrForm>(EMPTY_FORM)
  const [style, setStyle] = useState<QrStyle>(loadStyle)
  const [logo, setLogo] = useState<string | null>(null)
  const [generated, setGenerated] = useState<{ payload: string; matrix: QrMatrix } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealKey, setRevealKey] = useState(0)

  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('EAN13')
  const [barcodeValue, setBarcodeValue] = useState(BARCODE_SAMPLES.EAN13)
  const [barcodeStyle, setBarcodeStyle] = useState(loadBarcodeStyle)

  const payload = useDebounce(buildQrPayload(preset, form), 220)
  const debouncedBarcodeValue = useDebounce(barcodeValue, 180)

  useEffect(() => {
    saveStyle(style)
  }, [style])

  useEffect(() => {
    saveBarcodeStyle(barcodeStyle)
  }, [barcodeStyle])

  useEffect(() => {
    let live = true
    if (!payload) {
      Promise.resolve().then(() => {
        if (!live) return
        setGenerated(null)
        setError(null)
      })
      return () => {
        live = false
      }
    }
    void createQrMatrix(payload, style.ecl).then((result) => {
      if (!live) return
      if (result.ok) {
        setGenerated({ payload, matrix: result.value })
        setError(null)
        setRevealKey((key) => key + 1)
      } else {
        setGenerated(null)
        setError(result.error)
      }
    })
    return () => {
      live = false
    }
  }, [payload, style.ecl])

  const updateStyle = (patch: Partial<QrStyle>) => {
    setStyle((current) => ({ ...current, ...patch }))
    if (RESHAPE_KEYS.some((key) => key in patch)) setRevealKey((key) => key + 1)
  }

  const updateLogo = (next: string | null) => {
    setLogo(next)
    if (next) setStyle((current) => ({ ...current, ecl: 'H' }))
    else setRevealKey((key) => key + 1)
  }

  const editDecoded = (parsed: ParsedQrContent) => {
    setForm((current) => ({ ...current, ...parsedToForm(parsed) }))
    setPreset(parsed.kind)
    setMode('generate')
  }

  return (
    <ToolPage tool={tool} contentClassName="@container flex min-h-0 flex-col gap-3">
      <MotionConfig reducedMotion="user">
        <TabsPrimitive.Root value={mode} onValueChange={(value) => setMode(value as ToolkitMode)} className="flex flex-col gap-3">
          <ModeTiles
            label={t('qrk.mode.label')}
            layoutId="qr-toolkit-mode"
            value={mode}
            className="grid grid-cols-3 gap-1.5"
            tiles={MODES.map((value) => ({
              value,
              label: t(`qrk.mode.${value}`),
              hint: t(`qrk.mode.${value}Hint`),
              icon: MODE_META[value].icon,
              tone: MODE_META[value].tone,
            }))}
          />

          <TabsContent value="generate" className="mt-0">
            <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] @2xl:items-start">
              <SlideUp className="min-w-0 @2xl:col-start-1 @2xl:row-start-1">
                <SectionCard
                  icon={PenLineIcon}
                  title={t('qrk.contentTitle')}
                  description={t(`qrk.presetHint.${preset}`)}
                  bodyClassName="flex flex-col gap-4"
                >
                  <PresetPicker value={preset} onChange={(next: QrPreset) => setPreset(next)} />
                  <ContentFields
                    preset={preset}
                    form={form}
                    onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                  />
                </SectionCard>
              </SlideUp>

              <SlideUp
                delay={0.06}
                className="min-w-0 @2xl:sticky @2xl:top-0 @2xl:col-start-2 @2xl:row-span-2 @2xl:row-start-1"
              >
                <QrStage
                  payload={generated?.payload ?? ''}
                  matrix={generated?.matrix ?? null}
                  error={error}
                  style={style}
                  logo={logo}
                  revealKey={revealKey}
                  fileStem={`qr-${preset}`}
                  onUseHighCorrection={() => updateStyle({ ecl: 'H' })}
                />
              </SlideUp>

              <SlideUp delay={0.12} className="min-w-0 @2xl:col-start-1 @2xl:row-start-2">
                <DesignPanel style={style} onChange={updateStyle} logo={logo} onLogo={updateLogo} />
              </SlideUp>
            </div>
          </TabsContent>

          <TabsContent value="decode" className="mt-0">
            <SlideUp>
              <DecodePanel onEdit={editDecoded} />
            </SlideUp>
          </TabsContent>

          <TabsContent value="barcode" className="mt-0">
            <div className="grid grid-cols-1 gap-3 @xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] @xl:items-start">
              <SlideUp className="min-w-0">
                <BarcodePanel
                  format={barcodeFormat}
                  onFormat={setBarcodeFormat}
                  value={barcodeValue}
                  onValue={setBarcodeValue}
                  style={barcodeStyle}
                  onStyle={(patch) => setBarcodeStyle((current) => ({ ...current, ...patch }))}
                />
              </SlideUp>
              <SlideUp delay={0.06} className="min-w-0 @xl:sticky @xl:top-0">
                <BarcodeStage
                  format={barcodeFormat}
                  value={debouncedBarcodeValue}
                  style={barcodeStyle}
                  fileStem={`barcode-${barcodeFormat.toLowerCase()}`}
                />
              </SlideUp>
            </div>
          </TabsContent>
        </TabsPrimitive.Root>
      </MotionConfig>
    </ToolPage>
  )
}
