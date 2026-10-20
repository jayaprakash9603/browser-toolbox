import { ActivityIcon, BarChart3Icon, ListIcon, SettingsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useNetEvents, useNetLive, useNetMonitorSettings } from '@/features/netmon/hooks'
import { NETMON_TABS, type NetmonTab } from '@/features/netmon/routes'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'

import { useBrowserTool } from '../_shared'
import { GeneralStatsGrid } from './GeneralStatsGrid'
import { LogTab } from './LogTab'
import { MonitorOffCard } from './MonitorOffCard'
import { RealtimeTab } from './RealtimeTab'
import { SettingsTab } from './SettingsTab'
import { SpeedTestCard } from './SpeedTestCard'
import { StatsTab } from './StatsTab'
import { StatusHero } from './StatusHero'

const TAB_ICONS = {
  realtime: ActivityIcon,
  log: ListIcon,
  stats: BarChart3Icon,
  settings: SettingsIcon,
} satisfies Record<NetmonTab, unknown>

export default function InternetMonitorTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.internet-monitor')
  const { settings, patch } = useNetMonitorSettings()
  const live = useNetLive()
  const events = useNetEvents()
  const [tab, setTab] = useDeepLinkTab<NetmonTab>('tab', NETMON_TABS, 'realtime')

  if (!settings) return null

  return (
    <ToolPage
      tool={tool}
      actions={
        <Switch
          checked={settings.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('netmon.enable')}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {settings.enabled ? (
          <StatusHero live={live} settings={settings} />
        ) : (
          <MonitorOffCard onEnable={() => void patch({ enabled: true })} />
        )}
        <GeneralStatsGrid events={events} />
        <SpeedTestCard />
        <Tabs value={tab} onValueChange={(v) => setTab(v as NetmonTab)}>
          <TabsList>
            {NETMON_TABS.map((id) => {
              const Icon = TAB_ICONS[id]
              return (
                <TabsTrigger key={id} value={id}>
                  <Icon aria-hidden />
                  {t(`netmon.tab.${id}`)}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <TabsContent value="realtime">
            <RealtimeTab live={live} />
          </TabsContent>
          <TabsContent value="log">
            <LogTab events={events} settings={settings} patch={patch} />
          </TabsContent>
          <TabsContent value="stats">
            <StatsTab events={events} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab settings={settings} patch={patch} />
          </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
