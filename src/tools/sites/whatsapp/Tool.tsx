import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BriefcaseBusinessIcon, DownloadIcon, MessageCircleIcon, SlidersHorizontalIcon, WrenchIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import {
  countActiveFeatures,
  sectionLabelKey,
  WHATSAPP_FEATURES,
  WHATSAPP_SECTIONS,
  WHATSAPP_TOOL_TABS,
  type WaRuntimeStatus,
  type WhatsappFeatureValue,
} from '@/core/sites/whatsapp'
import { useWhatsappSettings } from '@/features/sites/useWhatsappSettings'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion/StaggerChildren'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { useSitesTool } from '../_shared'
import { SiteFeatureSection } from '../_components/SiteFeatureSection'
import { BusinessTab } from './BusinessTab'
import { ChatPulsePanel } from './ChatPulsePanel'
import { ExportTab } from './ExportTab'
import { PresetBar } from './PresetBar'
import { UtilitiesTab } from './UtilitiesTab'

const TAB_ICONS = {
  enhancements: SlidersHorizontalIcon,
  business: BriefcaseBusinessIcon,
  export: DownloadIcon,
  utilities: WrenchIcon,
} as const

const NS = 'sites.whatsapp'

export default function ChatBoostTool() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.whatsapp')
  const { state, patch } = useWhatsappSettings()
  const [tab, setTab] = useDeepLinkTab('tab', WHATSAPP_TOOL_TABS, 'enhancements')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<WaRuntimeStatus>('no_tab')
  useFocusTarget()

  useEffect(() => {
    const tick = () => void sendMessage<{ status: WaRuntimeStatus }>({ type: 'WA_GET_STATUS' }).then((r) => {
      if (r?.status) setStatus(r.status)
    })
    tick()
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [])

  const active = useMemo(() => (state ? countActiveFeatures(state) : 0), [state])

  if (!state) {
    return (
      <ToolPage tool={tool}>
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      </ToolPage>
    )
  }

  const onValues = (values: Record<string, WhatsappFeatureValue>) => void patch({ values })

  const statusLabel = t(`sites.whatsapp.status.${status}`)

  return (
    <ToolPage tool={tool}>
      <StaggerChildren className="flex flex-col gap-3">
        <StaggerItem>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageCircleIcon className="size-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-semibold">{t('sites.whatsapp.header.title')}</h2>
                  <p className="text-[11px] text-muted-foreground">{t('sites.whatsapp.header.subtitle')}</p>
                </div>
              </div>
              <Switch
                checked={state.enabled}
                onCheckedChange={(on) => void patch({ enabled: on })}
                aria-label={t('sites.whatsapp.header.title')}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{statusLabel}</span>
              <p className="text-xs text-muted-foreground">{t('sites.whatsapp.header.active', { count: active })}</p>
            </div>
            <Input
              className="mt-3 text-xs"
              placeholder={t('sites.whatsapp.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </StaggerItem>

        <StaggerItem>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList variant="pill" className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl border bg-muted/60 p-1">
              {WHATSAPP_TOOL_TABS.map((id) => {
                const Icon = TAB_ICONS[id]
                return (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="flex h-auto min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium leading-none text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="max-w-full truncate">{t(`sites.whatsapp.tabs.${id}`)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
            <TabsContent value="enhancements" className="mt-3 flex flex-col gap-3">
              <ChatPulsePanel disabled={!state.enabled} />
              <PresetBar onApply={(values) => void patch({ values: { ...state.values, ...values } })} />
              {WHATSAPP_SECTIONS.map((section) => (
                <SiteFeatureSection
                  key={section}
                  ns={NS}
                  sectionId={section}
                  sectionLabelKey={sectionLabelKey(section)}
                  features={WHATSAPP_FEATURES.filter((f) => f.section === section)}
                  enabled={state.enabled}
                  values={state.values}
                  query={query}
                  onPatch={onValues}
                  onResetSection={() => {
                    const defaults: Record<string, WhatsappFeatureValue> = {}
                    for (const f of WHATSAPP_FEATURES.filter((x) => x.section === section)) {
                      defaults[f.id] = f.default
                    }
                    onValues(defaults)
                  }}
                />
              ))}
            </TabsContent>
            <TabsContent value="business" className="mt-3">
              <BusinessTab state={state} onPatch={(data) => void patch({ data })} />
            </TabsContent>
            <TabsContent value="export" className="mt-3">
              <ExportTab disabled={!state.enabled} />
            </TabsContent>
            <TabsContent value="utilities" className="mt-3">
              <UtilitiesTab disabled={!state.enabled} />
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </StaggerChildren>
    </ToolPage>
  )
}
