import { ActivityIcon, BarChart3Icon, ListIcon, SettingsIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useNetEvents, useNetLive, useNetMonitorSettings, useNetRealtime } from '@/features/netmon/hooks'
import { NETMON_TABS, type NetmonTab } from '@/features/netmon/routes'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import { useBrowserTool } from '../_shared'
import { GeneralStatsGrid } from './GeneralStatsGrid'
import { InsightsPanel } from './InsightsPanel'
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

function TabReveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function InternetMonitorTool() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const tool = useBrowserTool('browser.internet-monitor')
  const { settings, patch } = useNetMonitorSettings()
  const live = useNetLive()
  const events = useNetEvents()
  const { samples, reset } = useNetRealtime(live)
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
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {settings.enabled ? (
            <StatusHero live={live} settings={settings} samples={samples} />
          ) : (
            <MonitorOffCard onEnable={() => void patch({ enabled: true })} />
          )}
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: reduce ? 0 : 0.05, ease: [0.16, 1, 0.3, 1] }}
        >
          <GeneralStatsGrid events={events} />
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: reduce ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <InsightsPanel events={events} />
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: reduce ? 0 : 0.14, ease: [0.16, 1, 0.3, 1] }}
        >
          <SpeedTestCard />
        </motion.div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as NetmonTab)}>
          <TabsList className="scrollbar-styled h-8 w-full justify-start gap-0.5 overflow-x-auto">
            {NETMON_TABS.map((id) => {
              const Icon = TAB_ICONS[id]
              return (
                <TabsTrigger
                  key={id}
                  value={id}
                  className={cn(
                    'h-7 gap-1 px-2.5 text-xs transition-[box-shadow,background-color] duration-200 motion-reduce:transition-none',
                  )}
                >
                  <Icon aria-hidden />
                  {t(`netmon.tab.${id}`)}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <TabsContent value="realtime">
            <TabReveal>
              <RealtimeTab live={live} samples={samples} onReset={() => void reset()} />
            </TabReveal>
          </TabsContent>
          <TabsContent value="log">
            <TabReveal>
              <LogTab events={events} settings={settings} patch={patch} />
            </TabReveal>
          </TabsContent>
          <TabsContent value="stats">
            <TabReveal>
              <StatsTab events={events} />
            </TabReveal>
          </TabsContent>
          <TabsContent value="settings">
            <TabReveal>
              <SettingsTab settings={settings} patch={patch} />
            </TabReveal>
          </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
