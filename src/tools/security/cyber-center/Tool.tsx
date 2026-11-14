import './i18n'
import { lazy, Suspense } from 'react'
import {
  AppWindowIcon,
  LayersIcon,
  DatabaseIcon,
  EyeOffIcon,
  FileSearchIcon,
  FingerprintIcon,
  GlobeIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LinkIcon,
  NetworkIcon,
  RadarIcon,
  ScanSearchIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SECURITY_CENTER_TABS, type SecurityCenterTab } from '@/core/security-center'
import { ToolPage } from '@/shared/components/ToolPage'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useSecurityTool } from '../_shared'
import { OverviewTab } from './OverviewTab'

const ProtectionTab = lazy(() => import('./ProtectionTab').then((mod) => ({ default: mod.ProtectionTab })))
const PrivacyTab = lazy(() => import('./PrivacyTab').then((mod) => ({ default: mod.PrivacyTab })))
const TrackersTab = lazy(() => import('./TrackersTab').then((mod) => ({ default: mod.TrackersTab })))
const CookiesTab = lazy(() => import('./CookiesTab').then((mod) => ({ default: mod.CookiesTab })))
const WebsiteAuditTab = lazy(() => import('./WebsiteAuditTab').then((mod) => ({ default: mod.WebsiteAuditTab })))
const NetworkTab = lazy(() => import('./NetworkTab').then((mod) => ({ default: mod.NetworkTab })))
const DnsTab = lazy(() => import('./DnsTab').then((mod) => ({ default: mod.DnsTab })))
const FingerprintTab = lazy(() => import('./FingerprintTab').then((mod) => ({ default: mod.FingerprintTab })))
const PasswordsTab = lazy(() => import('./PasswordsTab').then((mod) => ({ default: mod.PasswordsTab })))
const BreachesTab = lazy(() => import('./BreachesTab').then((mod) => ({ default: mod.BreachesTab })))
const FileScannerTab = lazy(() => import('./FileScannerTab').then((mod) => ({ default: mod.FileScannerTab })))
const UrlScannerTab = lazy(() => import('./UrlScannerTab').then((mod) => ({ default: mod.UrlScannerTab })))
const PermissionsTab = lazy(() => import('./PermissionsTab').then((mod) => ({ default: mod.PermissionsTab })))
const LogsTab = lazy(() => import('./LogsTab').then((mod) => ({ default: mod.LogsTab })))
const SettingsTab = lazy(() => import('./SettingsTab').then((mod) => ({ default: mod.SettingsTab })))

const TAB_ICONS = {
  overview: LayoutDashboardIcon,
  protection: ShieldIcon,
  privacy: EyeOffIcon,
  trackers: RadarIcon,
  cookies: LayersIcon,
  'website-audit': FileSearchIcon,
  network: NetworkIcon,
  'dns-and-ip': GlobeIcon,
  fingerprint: FingerprintIcon,
  passwords: KeyRoundIcon,
  'data-breaches': DatabaseIcon,
  'file-scanner': ScanSearchIcon,
  'url-scanner': LinkIcon,
  permissions: AppWindowIcon,
  'security-logs': ScrollTextIcon,
  settings: SettingsIcon,
} satisfies Record<SecurityCenterTab, typeof ShieldIcon>

const TAB_FALLBACK = <Skeleton className="h-48 w-full rounded-xl" />

export default function CyberSecurityCenterTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.cyber-center')
  const [tab, setTab] = useDeepLinkTab<SecurityCenterTab>('tab', SECURITY_CENTER_TABS, 'overview')

  return (
    <ToolPage tool={tool}>
      <Tabs value={tab} onValueChange={(value) => setTab(value as SecurityCenterTab)}>
        <TabsList variant="attached" fullWidth scrollButtons="auto">
          {SECURITY_CENTER_TABS.map((id) => {
            const Icon = TAB_ICONS[id]
            return (
              <TabsTrigger key={id} value={id}>
                <Icon aria-hidden className="size-3.5" />
                {t(`securityCenter.tab.${id}`, id)}
              </TabsTrigger>
            )
          })}
        </TabsList>
        <TabsContent value="overview" className="@container min-h-0 overflow-hidden">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="protection" className="@container min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <ProtectionTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="privacy" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <PrivacyTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="trackers" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <TrackersTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="cookies" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <CookiesTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="website-audit" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <WebsiteAuditTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="network" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <NetworkTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="dns-and-ip" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <DnsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="fingerprint" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <FingerprintTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="passwords" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <PasswordsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="data-breaches" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <BreachesTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="file-scanner" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <FileScannerTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="url-scanner" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <UrlScannerTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="permissions" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <PermissionsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="security-logs" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <LogsTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings" className="min-h-0 overflow-hidden">
          <Suspense fallback={TAB_FALLBACK}>
            <SettingsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
