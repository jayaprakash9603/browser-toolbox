import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlertIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'

import { DownloadPrompt } from './DownloadPrompt'

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
  const isDownload = new URLSearchParams(window.location.search).get('mode') === 'download'
  return isDownload ? <DownloadPrompt /> : <BlockedSitePage />
}

function BlockedSitePage() {
  const { t } = useTranslation()
  const ctx = useMemo(() => parseBlockedContext(), [])
  const reported = useRef(false)
  const [busy, setBusy] = useState(false)

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <ShieldAlertIcon className="size-8 text-destructive" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold">{t('protection.blocked.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('protection.blocked.subtitle')}</p>
          </div>
        </div>
        <p className="mb-2 text-sm">{t('protection.blocked.reason', { category: categoryLabel })}</p>
        <p className="mb-6 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">{ctx.host}</p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back()
              else void chrome.tabs.create({ url: 'https://www.google.com/' })
            }}
          >
            {t('protection.blocked.back')}
          </Button>
          <Button
            type="button"
            variant="outline"
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
            className="text-muted-foreground"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void (async () => {
                await sendMessage({ type: 'PROTECTION_TRUST_SITE', host: ctx.host })
                window.location.replace(ctx.targetUrl)
              })()
            }}
          >
            {t('protection.blocked.trust')}
          </Button>
        </div>
      </div>
    </div>
  )
}
