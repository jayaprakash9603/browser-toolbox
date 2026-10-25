import { ExternalLinkIcon, GlobeIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { scriptMatchesUrl } from '@/core/script-studio'
import type { ScriptRecord, ScriptStudioSettings } from '@/core/script-studio'
import { EmptyState } from '@/shared/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Switch } from '@/shared/components/ui/switch'

type Props = {
  url: string | null
  scripts: ScriptRecord[]
  settings: ScriptStudioSettings
  onToggle: (record: ScriptRecord, enabled: boolean) => void
  loadCode: (id: string) => Promise<string | null>
}

export function ThisPagePanel({ url, scripts, settings, onToggle, loadCode }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [found, setFound] = useState<{ url: string; scripts: ScriptRecord[] } | null>(null)
  const matching = url && found?.url === url ? found.scripts : []

  useEffect(() => {
    if (!url) return
    let cancelled = false
    void (async () => {
      const list: ScriptRecord[] = []
      for (const s of scripts.filter((r) => !r.trashed)) {
        const code = await loadCode(s.id)
        if (code && scriptMatchesUrl(s, code, url, settings)) list.push(s)
      }
      if (!cancelled) setFound({ url, scripts: list })
    })()
    return () => {
      cancelled = true
    }
  }, [url, scripts, settings, loadCode])

  const host = useMemo(() => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      return /^https?:$/.test(parsed.protocol) ? parsed.hostname : null
    } catch {
      return null
    }
  }, [url])

  const searchLinks = useMemo(() => {
    if (!host) return []
    const q = encodeURIComponent(host)
    return [
      { label: 'Greasy Fork', href: `https://greasyfork.org/en/scripts/by-site/${q}` },
      { label: 'OpenUserJS', href: `https://openuserjs.org/?q=${q}` },
      { label: 'userscript.zone', href: `https://www.userscript.zone/search?q=${q}` },
    ]
  }, [host])

  if (!host) {
    return <EmptyState icon={GlobeIcon} title={t('scriptStudio.thisPage.noSite')} description={t('scriptStudio.thisPage.noSiteHint')} />
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="truncate text-xs text-muted-foreground">{t('scriptStudio.thisPage.on', { host })}</p>

      {matching.length === 0 ? (
        <EmptyState icon={GlobeIcon} title={t('scriptStudio.noScripts')} description={t('scriptStudio.thisPage.emptyHint')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {matching.map((s, i) => (
            <motion.li
              key={s.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.03, duration: 0.22 }}
              className="flex min-h-12 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 shadow-xs"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">v{s.version}</p>
              </div>
              <Switch checked={s.enabled} onCheckedChange={(on) => onToggle(s, on)} aria-label={s.name} />
            </motion.li>
          ))}
        </ul>
      )}

      {settings.scriptSearchEnabled && host ? (
        <Card className="gap-2 py-3">
          <CardHeader className="px-3">
            <CardTitle className="text-xs">{t('scriptStudio.findScripts')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-3">
            {searchLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {l.label}
                <ExternalLinkIcon className="size-3" aria-hidden />
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
