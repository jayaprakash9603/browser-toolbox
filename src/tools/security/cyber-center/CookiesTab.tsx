import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  appendSecurityEvent,
  cookiesPermissionGranted,
  exportCookieMetadata,
  listCookiesForUrl,
  matchesCookieFilters,
  removeCookie,
  requestCookiesPermission,
  type CookieMetadata,
} from '@/core/security-center'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { downloadText, useActiveTabContext } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge } from './ui'

export function CookiesTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const [granted, setGranted] = useState<boolean | null>(null)
  const [cookies, setCookies] = useState<CookieMetadata[]>([])
  const [query, setQuery] = useState('')
  const [thirdPartyOnly, setThirdPartyOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const refreshGrant = useCallback(() => {
    void cookiesPermissionGranted().then(setGranted)
  }, [])

  const reload = useCallback(async () => {
    if (!context.url || context.restricted) {
      setCookies([])
      return
    }
    if (!(await cookiesPermissionGranted())) {
      setCookies([])
      return
    }
    try {
      setCookies(await listCookiesForUrl(context.url, context.hostname))
    } catch {
      setCookies([])
    }
  }, [context.hostname, context.restricted, context.url])

  useEffect(() => {
    refreshGrant()
    void reload()
  }, [refreshGrant, reload])

  const rows = useMemo(
    () => cookies.filter((cookie) => matchesCookieFilters(cookie, { query, thirdParty: thirdPartyOnly || undefined })),
    [cookies, query, thirdPartyOnly],
  )

  const keyOf = (cookie: CookieMetadata) => `${cookie.name}|${cookie.domain}|${cookie.path}`

  const deleteSelected = async () => {
    if (!selected.size) return
    if (!window.confirm(`Delete ${selected.size} cookie${selected.size === 1 ? '' : 's'}? Values are never shown.`)) return
    setBusy(true)
    const targets = rows.filter((cookie) => selected.has(keyOf(cookie)))
    for (const cookie of targets) {
      try {
        await removeCookie(cookie)
      } catch {
        /* keep going */
      }
    }
    await appendSecurityEvent({
      type: 'cookie_deleted',
      category: 'cookies',
      severity: 'info',
      domain: context.hostname,
      description: `Deleted ${targets.length} cookie${targets.length === 1 ? '' : 's'} on ${context.hostname || 'this site'}.`,
      action: 'delete',
      source: 'cookies',
    })
    setSelected(new Set())
    setBusy(false)
    await reload()
  }

  const deleteDomain = async () => {
    if (!cookies.length) return
    if (!window.confirm(`Delete all ${cookies.length} cookies visible for this site?`)) return
    setBusy(true)
    for (const cookie of cookies) {
      try {
        await removeCookie(cookie)
      } catch {
        /* keep going */
      }
    }
    await appendSecurityEvent({
      type: 'cookie_deleted',
      category: 'cookies',
      severity: 'info',
      domain: context.hostname,
      description: `Deleted this domain’s cookies for ${context.hostname}.`,
      action: 'delete-domain',
      source: 'cookies',
    })
    setBusy(false)
    await reload()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CapsLabel>Cookies</CapsLabel>
          <p className="text-sm text-muted-foreground">Metadata only. Values are hidden and never exported.</p>
        </div>
        <StatusBadge label={`${rows.length} shown`} tone="info" />
      </Panel>
      <PermissionNotice
        active
        permissions={['cookies']}
        message={t('securityCenter.grantCookies', 'Allow cookie access to list this site’s cookies. Values stay hidden.')}
      />
      {granted === false ? (
        <Button
          size="sm"
          className="self-start"
          onClick={() =>
            void requestCookiesPermission().then((ok) => {
              setGranted(ok)
              if (ok) void reload()
            })
          }
        >
          {t('securityCenter.grantCookies', 'Allow cookie access')}
        </Button>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter name or domain…" className="h-8 min-w-[10rem] flex-1" />
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={thirdPartyOnly} onCheckedChange={(value) => setThirdPartyOnly(value === true)} />
          Third-party
        </label>
        <Button size="sm" variant="outline" disabled={!selected.size || busy} onClick={() => void deleteSelected()}>
          {t('securityCenter.deleteSelected', 'Delete selected')}
        </Button>
        <Button size="sm" variant="outline" disabled={!cookies.length || busy} onClick={() => void deleteDomain()}>
          {t('securityCenter.deleteDomain', 'Delete this domain’s cookies')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!cookies.length}
          onClick={() => downloadText(`cookies-${context.hostname || 'site'}.json`, exportCookieMetadata(cookies))}
        >
          Export metadata
        </Button>
      </div>
      <Panel className="min-h-0 flex-1 overflow-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-card font-mono text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Domain</th>
              <th className="px-2 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cookie) => {
              const key = keyOf(cookie)
              return (
                <tr key={key} className="border-t align-top">
                  <td className="px-2 py-1.5">
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={(value) => {
                        setSelected((current) => {
                          const next = new Set(current)
                          if (value === true) next.add(key)
                          else next.delete(key)
                          return next
                        })
                      }}
                    />
                  </td>
                  <td className="px-2 py-1.5 font-mono">{cookie.name}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {cookie.domain}
                    {cookie.firstParty === false ? <span className="ml-1 text-muted-foreground">3p</span> : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {cookie.secure ? <StatusBadge label="Secure" tone="success" /> : null}
                      {cookie.httpOnly ? <StatusBadge label="HttpOnly" tone="info" /> : null}
                      <StatusBadge label={`SameSite ${cookie.sameSite}`} tone="muted" />
                      {cookie.observations.map((note) => (
                        <StatusBadge key={note} label={note} tone="warning" />
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyNote>{granted ? 'No cookies matched.' : 'Grant cookie access to inspect this site.'}</EmptyNote>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
