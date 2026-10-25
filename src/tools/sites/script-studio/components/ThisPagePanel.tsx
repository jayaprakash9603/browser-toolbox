import { ChevronRightIcon, ExternalLinkIcon, GlobeIcon, RotateCwIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { scriptMatchesUrl } from '@/core/script-studio'
import type { ScriptRecord, ScriptRun, ScriptStudioSettings, TabScriptRuns } from '@/core/script-studio'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { useNow } from '../hooks/useNow'
import {
  deriveRunState,
  formatAgo,
  formatDuration,
  needsReload,
  RUN_STATE_ORDER,
  RUN_STATE_STYLE,
  type RunState,
} from './runState'
import { ScriptRunDetails } from './ScriptRunDetails'

type Props = {
  url: string | null
  tabId: number | null
  scripts: ScriptRecord[]
  settings: ScriptStudioSettings
  runs: TabScriptRuns
  globalEnabled: boolean
  operational: boolean
  onToggle: (record: ScriptRecord, enabled: boolean) => void
  onEdit: (id: string) => void
  loadCode: (id: string) => Promise<string | null>
}

type Row = { record: ScriptRecord; run: ScriptRun | undefined; state: RunState; reload: boolean }

export function ThisPagePanel({ url, tabId, scripts, settings, runs, globalEnabled, operational, onToggle, onEdit, loadCode }: Props) {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const now = useNow()
  const [found, setFound] = useState<{ url: string; ids: Set<string> } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const matchIds = url && found?.url === url ? found.ids : null

  useEffect(() => {
    if (!url) return
    let cancelled = false
    void (async () => {
      const ids = new Set<string>()
      for (const s of scripts.filter((r) => !r.trashed)) {
        const code = await loadCode(s.id)
        if (code && scriptMatchesUrl(s, code, url, settings)) ids.add(s.id)
      }
      if (!cancelled) setFound({ url, ids })
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

  const rows = useMemo<Row[]>(() => {
    if (!matchIds) return []
    // Scripts that already ran stay listed even if their rules no longer match, since they are live in the page.
    return scripts
      .filter((s) => !s.trashed && (matchIds.has(s.id) || runs[s.id]))
      .map((record) => {
        const run = runs[record.id]
        const state = deriveRunState(record, run, globalEnabled, operational)
        return { record, run, state, reload: needsReload(record, run, state, globalEnabled) }
      })
      .sort((a, b) => RUN_STATE_ORDER[a.state] - RUN_STATE_ORDER[b.state] || a.record.name.localeCompare(b.record.name))
  }, [matchIds, scripts, runs, globalEnabled, operational])

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

  const counts = rows.reduce<Partial<Record<RunState, number>>>((acc, r) => ({ ...acc, [r.state]: (acc[r.state] ?? 0) + 1 }), {})
  const executed = (counts.ran ?? 0) + (counts.error ?? 0)
  const anyReload = rows.some((r) => r.reload)
  const detail = rows.find((r) => r.record.id === detailId)
  const reloadTab = () => {
    if (tabId != null) void chrome.tabs.reload(tabId)
  }

  const statusLine = (r: Row): string => {
    if (r.state === 'ran' && r.run) {
      return t('scriptStudio.runs.line.ran', { ago: formatAgo(r.run.lastRunAt, now, i18n.language), duration: formatDuration(r.run.durationMs) })
    }
    if (r.state === 'error' && r.run) {
      const message = (r.run.error ?? '').split('\n')[0] || t('scriptStudio.runs.state.error')
      return t('scriptStudio.runs.line.error', { ago: formatAgo(r.run.lastRunAt, now, i18n.language), message })
    }
    return t(`scriptStudio.runs.line.${r.state}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {matchIds && rows.length > 0 ? (
        <section aria-label={t('scriptStudio.runs.breakdown')} className="flex flex-col gap-2.5 rounded-xl border bg-card p-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-muted-foreground">{t('scriptStudio.thisPage.on', { host })}</p>
              <p role="status" aria-atomic="true" className="text-sm font-semibold tabular-nums">
                {executed > 0 ? t('scriptStudio.runs.summary', { ran: executed, total: rows.length }) : t('scriptStudio.runs.summaryNone')}
              </p>
            </div>
            {anyReload && tabId != null ? (
              <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs" onClick={reloadTab} title={t('scriptStudio.runs.reloadHint')}>
                <RotateCwIcon className="size-3.5" aria-hidden />
                {t('scriptStudio.runs.reload')}
              </Button>
            ) : null}
          </div>

          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {rows.map((r) => (
              <motion.span
                key={r.record.id}
                layout={!reduce}
                className={cn('h-full flex-1 rounded-full transition-colors duration-300', RUN_STATE_STYLE[r.state].bar)}
              />
            ))}
          </div>

          <ul className="flex flex-wrap gap-1.5">
            {(Object.keys(RUN_STATE_ORDER) as RunState[])
              .filter((s) => counts[s])
              .map((s) => {
                const { icon: Icon, tone } = RUN_STATE_STYLE[s]
                return (
                  <li key={s} className={cn('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium tabular-nums', tone)}>
                    <Icon className="size-3" aria-hidden />
                    {t(`scriptStudio.runs.state.${s}`)}
                    <span className="opacity-80">{counts[s]}</span>
                  </li>
                )
              })}
          </ul>
        </section>
      ) : (
        <p className="truncate text-xs text-muted-foreground">{t('scriptStudio.thisPage.on', { host })}</p>
      )}

      {matchIds && rows.length === 0 ? (
        <EmptyState icon={GlobeIcon} title={t('scriptStudio.noScripts')} description={t('scriptStudio.thisPage.emptyHint')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const { icon: Icon, tone } = RUN_STATE_STYLE[r.state]
            return (
              <motion.li
                key={r.record.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : i * 0.03, duration: 0.22 }}
                className={cn(
                  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card py-2 ps-2.5 pe-3 shadow-xs',
                  r.state === 'error' && 'border-destructive/40',
                )}
              >
                <span className={cn('grid size-8 place-items-center rounded-full', tone)} aria-hidden>
                  <Icon className="size-4" />
                </span>
                <button
                  type="button"
                  onClick={() => setDetailId(r.record.id)}
                  aria-label={t('scriptStudio.runs.viewDetails', { name: r.record.name })}
                  className="group flex min-h-11 min-w-0 items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={cn('truncate text-sm font-medium', r.state === 'off' && 'text-muted-foreground')}>{r.record.name}</span>
                      <span className="sr-only">, {t(`scriptStudio.runs.state.${r.state}`)}</span>
                    </span>
                    <span
                      className={cn(
                        'block truncate text-[11px] tabular-nums',
                        r.state === 'error' ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {statusLine(r)}
                      {r.run?.frameRuns ? ` · ${t('scriptStudio.runs.line.frames', { count: r.run.frameRuns })}` : ''}
                      {r.run && r.reload ? ` · ${t('scriptStudio.runs.line.stopsOnReload')}` : ''}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </button>
                <Switch checked={r.record.enabled} onCheckedChange={(on) => onToggle(r.record, on)} aria-label={r.record.name} />
              </motion.li>
            )
          })}
        </ul>
      )}

      {detail ? (
        <ScriptRunDetails
          open
          onOpenChange={(open) => !open && setDetailId(null)}
          record={detail.record}
          run={detail.run}
          state={detail.state}
          reloadNeeded={detail.reload && tabId != null}
          onToggle={onToggle}
          onEdit={(id) => {
            setDetailId(null)
            onEdit(id)
          }}
          onReload={() => {
            setDetailId(null)
            reloadTab()
          }}
          loadCode={loadCode}
        />
      ) : null}

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
