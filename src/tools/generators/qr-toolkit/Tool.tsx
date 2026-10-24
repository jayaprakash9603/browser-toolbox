import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PenLineIcon, QrCodeIcon, ScanLineIcon } from 'lucide-react'

import { createQrMatrix, type ParsedQrContent, type QrMatrix, type QrPreset } from '@/core/engines/qrcode'
import { useDeepLinkParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { ToolPage } from '@/shared/components/ToolPage'
import { SectionCard } from '@/shared/components/ValueCard'
import { SlideUp } from '@/shared/components/motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { useGeneratorTool } from '../_shared'
import { ContentFields, PresetPicker } from './ContentFields'
import { DecodePanel } from './DecodePanel'
import { DesignPanel } from './DesignPanel'
import { QrStage } from './QrStage'
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

const RESHAPE_KEYS: (keyof QrStyle)[] = ['moduleShape', 'eyeShape', 'margin']

export default function QrToolkitTool() {
  const { t } = useTranslation()
  const tool = useGeneratorTool('generators.qr-toolkit')
  const [mode, setMode] = useDeepLinkTab('tab', ['generate', 'decode'] as const, 'generate')
  const [preset, setPreset] = useDeepLinkParam('preset', PRESETS, 'text')
  const [form, setForm] = useState<QrForm>(EMPTY_FORM)
  const [style, setStyle] = useState<QrStyle>(loadStyle)
  const [logo, setLogo] = useState<string | null>(null)
  const [generated, setGenerated] = useState<{ payload: string; matrix: QrMatrix } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealKey, setRevealKey] = useState(0)

  const payload = useDebounce(buildQrPayload(preset, form), 220)

  useEffect(() => {
    saveStyle(style)
  }, [style])

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
    <ToolPage tool={tool}>
      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)} className="gap-3">
        <TabsList>
          <TabsTrigger value="generate">
            <QrCodeIcon aria-hidden />
            {t('qr.generate')}
          </TabsTrigger>
          <TabsTrigger value="decode">
            <ScanLineIcon aria-hidden />
            {t('qr.decode')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-0">
          <div className="@container">
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
          </div>
        </TabsContent>

        <TabsContent value="decode" className="mt-0">
          <SlideUp>
            <DecodePanel onEdit={editDecoded} />
          </SlideUp>
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
