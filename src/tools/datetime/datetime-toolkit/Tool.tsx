import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalculatorIcon, EarthIcon, HashIcon, RepeatIcon } from 'lucide-react'

import { parseCron } from '@/core/engines/date'
import { consumePayload } from '@/core/payloads'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { ToolPage } from '@/shared/components/ToolPage'
import { SlideUp } from '@/shared/components/motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { useDateTimeTool } from '../_shared'
import { CalculatorPanel } from './CalculatorPanel'
import { CronPanel } from './CronPanel'
import { TimestampPanel } from './TimestampPanel'
import { ZonesPanel } from './ZonesPanel'

const TABS = ['timestamp', 'calc', 'zones', 'cron'] as const
type Tab = (typeof TABS)[number]

export default function DateTimeToolkitTool() {
  const { t } = useTranslation()
  const tool = useDateTimeTool('datetime.toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', TABS, 'timestamp')
  const [seed, setSeed] = useState<{ tab: Tab; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    void consumePayload(tool.id).then((payload) => {
      const text = payload?.text?.trim()
      if (cancelled || !text) return
      const target: Tab = text.split(/\s+/).length === 5 && parseCron(text).ok ? 'cron' : 'timestamp'
      setSeed({ tab: target, text })
      setTab(target)
    })
    return () => {
      cancelled = true
    }
  }, [tool.id, setTab])

  const seedFor = (target: Tab) => (seed?.tab === target ? seed.text : '')

  return (
    <ToolPage tool={tool}>
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-3">
        <TabsList>
          <TabsTrigger value="timestamp">
            <HashIcon aria-hidden />
            {t('dt.tabTimestamp')}
          </TabsTrigger>
          <TabsTrigger value="calc">
            <CalculatorIcon aria-hidden />
            {t('dt.tabCalc')}
          </TabsTrigger>
          <TabsTrigger value="zones">
            <EarthIcon aria-hidden />
            {t('dt.tabZones')}
          </TabsTrigger>
          <TabsTrigger value="cron">
            <RepeatIcon aria-hidden />
            {t('dtk.tabCron')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timestamp" className="mt-0">
          <SlideUp>
            <TimestampPanel key={seedFor('timestamp')} initialInput={seedFor('timestamp')} />
          </SlideUp>
        </TabsContent>
        <TabsContent value="calc" className="mt-0">
          <SlideUp>
            <CalculatorPanel />
          </SlideUp>
        </TabsContent>
        <TabsContent value="zones" className="mt-0">
          <SlideUp>
            <ZonesPanel />
          </SlideUp>
        </TabsContent>
        <TabsContent value="cron" className="mt-0">
          <SlideUp>
            <CronPanel key={seedFor('cron')} initialInput={seedFor('cron')} />
          </SlideUp>
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
