import { useTranslation } from 'react-i18next'
import { DatabaseIcon, ShieldAlertIcon, CreditCardIcon } from 'lucide-react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { ToolPage } from '@/shared/components/ToolPage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useQaTool } from '../_shared'
import { DatasetTab } from './DatasetTab'
import { EdgeCasesTab } from './EdgeCasesTab'
import { PaymentsTab } from './PaymentsTab'

const TABS = ['dataset', 'edge', 'payments'] as const

export default function TestDataGeneratorTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.test-data-generator')
  const [tab, setTab] = useDeepLinkTab('tab', TABS, 'dataset')

  return (
    <ToolPage tool={tool}>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as (typeof TABS)[number])}
        className="min-h-0 flex-1"
      >
        <TabsList variant="pill" scrollButtons={false}>
          <TabsTrigger value="dataset">
            <DatabaseIcon /> {t('testData.tabs.dataset')}
          </TabsTrigger>
          <TabsTrigger value="edge">
            <ShieldAlertIcon /> {t('testData.tabs.edge')}
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCardIcon /> {t('testData.tabs.payments')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dataset">
          <DatasetTab />
        </TabsContent>
        <TabsContent value="edge">
          <EdgeCasesTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
