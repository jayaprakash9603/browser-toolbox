import { getActiveWebTab } from '@/chrome/contentScriptClient'
import { getAdblockState, getAdblockTabStats } from '@/core/adblock'
import { hasHostAccess } from '@/core/permissions/originPermissions'
import { getProtectionState, getProtectionStats } from '@/core/protection'
import {
  appendSecurityEvent,
  buildOverviewFindings,
  buildScanReport,
  collectDomAuditWorld,
  cookiesPermissionGranted,
  describePermission,
  fetchDocumentHeaders,
  formatRawHeaders,
  listCookiesForUrl,
  permissionStateFrom,
  queryPagePermissionsWorld,
  tabContextFromUrl,
  updateSecurityCenterSettings,
  type CookieMetadata,
  type PageAuditInput,
  type SecurityScanReport,
  type SitePermissionStatus,
} from '@/core/security-center'

export interface SiteScanBundle {
  report: SecurityScanReport
  audit: PageAuditInput | null
  permissions: SitePermissionStatus[] | null
  cookies: CookieMetadata[] | null
  cookiesAvailable: boolean
  rawHeaders: string
}

let lastBundle: SiteScanBundle | null = null

export function getLastSiteScan(): SiteScanBundle | null {
  return lastBundle
}

export async function runSiteScan(): Promise<SecurityScanReport> {
  const bundle = await runSiteScanBundle()
  return bundle.report
}

export async function runSiteScanBundle(): Promise<SiteScanBundle> {
  const tab = await getActiveWebTab()
  const context = tabContextFromUrl(tab?.url, tab?.id)
  const [protection, protectionStats, adblock, tabMap] = await Promise.all([
    getProtectionState(),
    getProtectionStats(),
    getAdblockState(),
    getAdblockTabStats(),
  ])
  const adblockTab = tab?.id != null ? tabMap[String(tab.id)] ?? null : null

  let audit: PageAuditInput | null = null
  let permissions: SitePermissionStatus[] | null = null
  let cookies: CookieMetadata[] | null = null
  let cookiesAvailable = false

  if (!context.restricted && tab?.id != null && tab.url) {
    const hostOk = await hasHostAccess(tab.url)
    const headerScan = hostOk
      ? await fetchDocumentHeaders(tab.url)
      : { headers: {} as Record<string, string>, available: false }

    let dom = {
      mixedContent: [] as string[],
      scripts: [] as string[],
      stylesheets: [] as string[],
      thirdPartyHosts: [] as string[],
      sriMissing: 0,
    }
    try {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectDomAuditWorld,
      })
      const value = injected[0]?.result
      if (value) dom = value
    } catch {
      /* restricted or no scripting access */
    }
    audit = {
      url: tab.url,
      https: context.https,
      headers: headerScan.headers,
      headersAvailable: headerScan.available,
      ...dom,
    }

    try {
      const queried = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: queryPagePermissionsWorld,
      })
      const rows = queried[0]?.result
      if (Array.isArray(rows)) {
        permissions = rows.map((row) => describePermission(row.permission, permissionStateFrom(row.state)))
      }
    } catch {
      permissions = null
    }

    cookiesAvailable = await cookiesPermissionGranted()
    if (cookiesAvailable) {
      try {
        cookies = await listCookiesForUrl(tab.url, context.hostname)
      } catch {
        cookiesAvailable = false
      }
    }
  }

  const findings = buildOverviewFindings({
    context,
    protection,
    protectionStats,
    adblock,
    adblockTab,
    audit,
    cookies,
    cookiesAvailable,
    permissions,
  })
  const report = buildScanReport(
    {
      context,
      protection,
      protectionStats,
      adblock,
      adblockTab,
      audit,
      cookies,
      cookiesAvailable,
      permissions,
    },
    findings,
  )
  await updateSecurityCenterSettings({ lastScanAt: report.timestamp, lastScanDomain: report.domain })
  await appendSecurityEvent({
    type: 'security_audit_completed',
    category: 'audit',
    severity: 'info',
    domain: report.domain,
    description: `Scan completed for ${report.domain || 'the active tab'} (${report.completedChecks} checks).`,
    action: 'scan',
    source: 'overview',
  })
  lastBundle = {
    report,
    audit,
    permissions,
    cookies,
    cookiesAvailable,
    rawHeaders: formatRawHeaders(audit?.headers ?? {}, audit?.headersAvailable ?? false),
  }
  return lastBundle
}
