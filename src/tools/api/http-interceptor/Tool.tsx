import { BookOpenIcon, ListIcon, NetworkIcon, SettingsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { INTERCEPTOR_TABS, type InterceptorTab } from '@/features/interceptor/routes'
import { useInterceptorState } from '@/features/interceptor/hooks'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'

import { useApiTool } from '../_shared'
import { LibraryTab } from './LibraryTab'
import { NetworkTab } from './NetworkTab'
import { RulesTab } from './RulesTab'
import { SettingsTab } from './SettingsTab'

const TAB_ICONS = {
  rules: ListIcon,
  network: NetworkIcon,
  library: BookOpenIcon,
  settings: SettingsIcon,
} satisfies Record<InterceptorTab, unknown>

export default function HttpInterceptorTool() {
  const { t } = useTranslation()
  const tool = useApiTool('api.http-interceptor')
  const { state, setState, patchSettings } = useInterceptorState()
  const [tab, setTab] = useDeepLinkTab<InterceptorTab>('tab', INTERCEPTOR_TABS, 'rules')

  if (!state) return null

  return (
    <ToolPage
      tool={tool}
      actions={
        <Switch
          checked={!state.settings.paused}
          onCheckedChange={(on) => void patchSettings({ paused: !on })}
          aria-label={state.settings.paused ? t('interceptor.resume') : t('interceptor.pauseAll')}
        />
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as InterceptorTab)}>
        <TabsList>
          {INTERCEPTOR_TABS.map((id) => {
            const Icon = TAB_ICONS[id]
            return (
              <TabsTrigger key={id} value={id}>
                <Icon aria-hidden className="size-3.5" />
                {t(`interceptor.tab.${id}`)}
              </TabsTrigger>
            )
          })}
        </TabsList>
        <TabsContent value="rules">
          <RulesTab state={state} onStateChange={setState} />
        </TabsContent>
        <TabsContent value="network">
          <NetworkTab state={state} />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab state={state} onStateChange={setState} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab state={state} patchSettings={patchSettings} />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
