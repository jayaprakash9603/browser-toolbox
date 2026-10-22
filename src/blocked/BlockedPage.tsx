import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, ShieldAlertIcon, ShieldOffIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'

import { DownloadPrompt } from './DownloadPrompt'
import { DetailRow, ProtectionInterstitial } from './ProtectionInterstitial'

const LIST_CATEGORIES = ['phishing', 'malware', 'scam', 'miner'] as const
type ListCategory = (typeof LIST_CATEGORIES)[number]

function parseBlockedContext(): { category: ListCategory; targetUrl: string; host: string } {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('c') ?? 'phishing'
  const category = (LIST_CATEGORIES as readonly string[]).includes(raw) ? (raw as ListCategory) : 'phishing'
  const hash = window.location.hash.replace(/^#/, '')
  const targetUrl = hash || 'about:blank'
  let host = targetUrl
  try {
    host = new URL(targetUrl).hostname
  } catch {
    /* keep raw target as display fallback */
  }
  return { category, targetUrl, host }
}

export function BlockedPage() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'download') return <DownloadPrompt />
  if (mode === 'redirect') return <RedirectBlockedPage />
  return <BlockedSitePage />
}

function RedirectBlockedPage() {
  const { t } = useTranslation()
  const ctx = useMemo(() => parseBlockedContext(), [])
  const opener = new URLSearchParams(window.location.search).get('opener') ?? ''
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = t('protection.redirect.title')
  }, [t])

  return (
    <ProtectionInterstitial
      icon={ShieldAlertIcon}
      tone="danger"
      badge={t('protection.category.redirect')}
      title={t('protection.redirect.title')}
      description={t('protection.redirect.reason', { opener })}
      tips={[t('protection.redirect.tipSafe'), t('protection.redirect.tipProceed')]}
      details={
        <>
          <DetailRow label={t('protection.redirect.openerLabel')} value={opener} />
          <DetailRow label={t('protection.blocked.addressLabel')} value={ctx.host} />
        </>
      }
      actions={
        <>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              void chrome.tabs.getCurrent().then((tab) => {
                if (tab?.id != null) void chrome.tabs.remove(tab.id)
                else window.close()
              })
            }}
          >
            {t('protection.redirect.close')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void (async () => {
                await sendMessage({ type: 'PROTECTION_ALLOW_OPENED_TAB', url: ctx.targetUrl })
                window.location.replace(ctx.targetUrl)
              })()
            }}
          >
            {t('protection.redirect.proceed')}
          </Button>
        </>
      }
    />
  )
}

function BlockedSitePage() {
  const { t } = useTranslation()
  const ctx = useMemo(() => parseBlockedContext(), [])
  const reported = useRef(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = t('protection.blocked.title')
  }, [t])

  useEffect(() => {
    if (reported.current) return
    reported.current = true
    void sendMessage({
      type: 'PROTECTION_REPORT',
      category: ctx.category,
      host: ctx.host,
      source: 'list',
    })
  }, [ctx.category, ctx.host])

  const categoryLabel = t(`protection.category.${ctx.category}`)

  return (
    <ProtectionInterstitial
      icon={ShieldAlertIcon}
      tone="danger"
      badge={categoryLabel}
      title={t('protection.blocked.title')}
      description={t('protection.blocked.reason', { category: categoryLabel })}
      tips={[t('protection.blocked.tipSafe'), t('protection.blocked.tipProceed')]}
      details={<DetailRow label={t('protection.blocked.addressLabel')} value={ctx.host} />}
      actions={
        <>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              if (window.history.length > 1) window.history.back()
              else void chrome.tabs.create({ url: 'https://www.google.com/' })
            }}
          >
            <ArrowLeftIcon aria-hidden />
            {t('protection.blocked.back')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void (async () => {
                await sendMessage({ type: 'PROTECTION_PROCEED_ONCE', url: ctx.targetUrl })
                window.location.replace(ctx.targetUrl)
              })()
            }}
          >
            {t('protection.blocked.proceed')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void (async () => {
                await sendMessage({ type: 'PROTECTION_TRUST_SITE', host: ctx.host })
                window.location.replace(ctx.targetUrl)
              })()
            }}
          >
            <ShieldOffIcon aria-hidden />
            {t('protection.blocked.trust')}
          </Button>
        </>
      }
    />
  )
}
