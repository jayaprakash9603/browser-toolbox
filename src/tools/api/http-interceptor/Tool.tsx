import './i18n'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  BookOpenIcon,
  FolderIcon,
  ListIcon,
  NetworkIcon,
  RadarIcon,
  SendIcon,
  SettingsIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { resolveCaptureStatus } from '@/core/interceptor/captureStatus'
import { INTERCEPTOR_TABS, type InterceptorTab } from '@/features/interceptor/routes'
import { ApiWorkspaceProvider } from '@/features/interceptor/ApiWorkspaceContext'
import { useInterceptorLog, useInterceptorState } from '@/features/interceptor/hooks'
import { fromNetLog } from '@/features/interceptor/networkModel'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'

import { useApiTool } from '../_shared'
import { CaptureStatusBar } from './CaptureStatusBar'
import { RulesTab } from './RulesTab'
import { SettingsTab } from './SettingsTab'

const NetworkTab = lazy(() => import('./NetworkTab').then((m) => ({ default: m.NetworkTab })))
const LibraryTab = lazy(() => import('./LibraryTab').then((m) => ({ default: m.LibraryTab })))
const FinderTab = lazy(() => import('./FinderTab').then((m) => ({ default: m.FinderTab })))
const ExplorerTab = lazy(() => import('./ExplorerTab').then((m) => ({ default: m.ExplorerTab })))
const CollectionsTab = lazy(() => import('./CollectionsTab').then((m) => ({ default: m.CollectionsTab })))

const TAB_ICONS = {
  rules: ListIcon,
  network: NetworkIcon,
  finder: RadarIcon,
  explorer: SendIcon,
  collections: FolderIcon,
  library: BookOpenIcon,
  settings: SettingsIcon,
} satisfies Record<InterceptorTab, unknown>

export default function HttpInterceptorTool() {
  const { t } = useTranslation()
  const tool = useApiTool('api.http-interceptor')
  const { state, setState, patchSettings } = useInterceptorState()
  const [tab, setTab] = useDeepLinkTab<InterceptorTab>('tab', INTERCEPTOR_TABS, 'rules')
  const [activeTabId, setActiveTabId] = useState<number | undefined>()
  const [currentHost, setCurrentHost] = useState<string | undefined>()
  const webRequestGranted = usePermissionGranted({ permissions: ['webRequest'] })
  const { entries, clear } = useInterceptorLog(activeTabId)
  const rows = useMemo(() => entries.map(fromNetLog), [entries])

  useEffect(() => {
    const refresh = () =>
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([current]) => {
        if (current?.id != null) setActiveTabId(current.id)
        try {
          if (current?.url) setCurrentHost(new URL(current.url).host)
        } catch {
          setCurrentHost(undefined)
        }
      })
    refresh()
    chrome.tabs.onActivated.addListener(refresh)
    chrome.tabs.onUpdated.addListener(refresh)
    return () => {
      chrome.tabs.onActivated.removeListener(refresh)
      chrome.tabs.onUpdated.removeListener(refresh)
    }
  }, [])

  if (!state) return null

  const captureStatus = resolveCaptureStatus({
    webRequestGranted,
    capturePaused: state.settings.capturePaused,
  })

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
      <PermissionNotice
        active
        permissions={['webRequest']}
        message={t('siteAccess.interceptorNeeded')}
      />
      <ApiWorkspaceProvider
        rows={rows}
        currentHost={currentHost}
        includeSecrets={state.settings.includeSecretsInCopy}
        onOpenTab={setTab}
      >
        <div className="mb-2">
          <CaptureStatusBar
            status={captureStatus}
            capturePaused={state.settings.capturePaused}
            onToggleCapture={(paused) => void patchSettings({ capturePaused: paused })}
          />
        </div>
        <Tabs value={tab} onValueChange={(value) => setTab(value as InterceptorTab)}>
          <TabsList fullWidth scrollButtons="auto">
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
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
              <NetworkTab
                rows={rows}
                onClear={clear}
                capturePaused={state.settings.capturePaused}
                onCapturePausedChange={(paused) => void patchSettings({ capturePaused: paused })}
                includeSecrets={state.settings.includeSecretsInCopy}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="finder" className="@container">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
              <FinderTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="explorer" className="min-h-[36rem] overflow-hidden p-3">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
              <ExplorerTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="collections">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
              <CollectionsTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="library">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
              <LibraryTab state={state} onStateChange={setState} />
            </Suspense>
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab state={state} patchSettings={patchSettings} />
          </TabsContent>
        </Tabs>
      </ApiWorkspaceProvider>
    </ToolPage>
  )
}
