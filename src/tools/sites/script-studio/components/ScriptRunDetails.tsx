import { CheckIcon, CopyIcon, PencilIcon, RotateCwIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { normalizeGrants, parseMetadata, pickLocalized, usesSandbox } from '@/core/script-studio'
import type { ParsedMetadata, ScriptRecord, ScriptRun } from '@/core/script-studio'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { useNow } from '../hooks/useNow'
import { formatAgo, formatDuration, RUN_STATE_STYLE, type RunState } from './runState'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: ScriptRecord
  run: ScriptRun | undefined
  state: RunState
  reloadNeeded: boolean
  onToggle: (record: ScriptRecord, enabled: boolean) => void
  onEdit: (id: string) => void
  onReload: () => void
  loadCode: (id: string) => Promise<string | null>
}

export function ScriptRunDetails({ open, onOpenChange, record, run, state, reloadNeeded, onToggle, onEdit, onReload, loadCode }: Props) {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const [meta, setMeta] = useState<{ id: string; meta: ParsedMetadata | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const style = RUN_STATE_STYLE[state]
  const Icon = style.icon

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void loadCode(record.id).then((code) => {
      if (!cancelled) setMeta({ id: record.id, meta: code ? parseMetadata(code) : null })
    })
    return () => {
      cancelled = true
    }
  }, [open, record.id, loadCode])

  const parsed = meta?.id === record.id ? meta.meta : null
  const description = parsed ? pickLocalized(parsed.description, i18n.language) : ''
  const runAt = record.overrides.runAt ?? parsed?.runAt
  const sandbox = record.overrides.sandbox ?? parsed?.sandbox
  const grants = parsed ? normalizeGrants(parsed.grants) : []
  const pageContext = parsed ? sandbox === 'raw' || grants.includes('none') || !usesSandbox(grants) : null
  const stoppingOnReload = Boolean(run) && reloadNeeded

  const copyError = async () => {
    if (!run?.error) return
    await navigator.clipboard.writeText(run.error).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fields: { label: string; value: string; mono?: boolean }[] = []
  if (run) {
    fields.push(
      { label: t('scriptStudio.runs.field.lastRun'), value: `${formatAgo(run.lastRunAt, now, i18n.language)} · ${new Date(run.lastRunAt).toLocaleTimeString()}` },
      { label: t('scriptStudio.runs.field.duration'), value: formatDuration(run.durationMs) },
      {
        label: t('scriptStudio.runs.field.count'),
        value: run.frameRuns
          ? t('scriptStudio.runs.field.countFrames', { count: run.runs, frames: run.frameRuns })
          : String(run.runs),
      },
    )
  }
  if (runAt) fields.push({ label: t('scriptStudio.runs.field.runAt'), value: t(`scriptStudio.runs.runAt.${runAt}`) })
  if (pageContext !== null) {
    fields.push({
      label: t('scriptStudio.runs.field.context'),
      value: pageContext ? t('scriptStudio.runs.context.page') : t('scriptStudio.runs.context.sandbox'),
    })
  }
  if (run?.url) fields.push({ label: t('scriptStudio.runs.field.page'), value: run.url, mono: true })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader className="pe-6">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('scriptStudio.runs.details.title')}</p>
          <DialogTitle className="truncate text-base">{record.name}</DialogTitle>
          <DialogDescription className="text-xs">
            v{record.version}
            {parsed?.author ? ` · ${parsed.author}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div role="status" className={cn('flex gap-3 rounded-lg p-3', style.tone)}>
          <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t(`scriptStudio.runs.headline.${state}`)}</p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-90">
              {stoppingOnReload ? t('scriptStudio.runs.explain.stopsOnReload') : t(`scriptStudio.runs.explain.${state}`)}
            </p>
          </div>
        </div>

        {run?.note ? (
          <div aria-live="polite" className="rounded-lg border border-primary/25 bg-primary/5 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('scriptStudio.runs.result')}</p>
              <p className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{formatAgo(run.noteAt ?? run.lastRunAt, now, i18n.language)}</p>
            </div>
            <p className="mt-1 text-sm leading-relaxed break-words">{run.note}</p>
          </div>
        ) : null}

        {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}

        {fields.length ? (
          <dl className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-lg border p-3 text-xs">
            {fields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className={cn('min-w-0 font-medium break-words tabular-nums', f.mono && 'font-mono text-[11px] font-normal break-all')}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {run?.error ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-destructive">{t('scriptStudio.runs.error')}</p>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void copyError()}>
                {copied ? <CheckIcon className="size-3.5" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
                {copied ? t('scriptStudio.runs.copied') : t('scriptStudio.runs.copyError')}
              </Button>
            </div>
            <pre className="max-h-40 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
              {run.error}
            </pre>
          </div>
        ) : null}

        <DialogFooter className="flex-row flex-wrap items-center gap-2 border-t pt-3 sm:justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id={`ss-run-enabled-${record.id}`}
              checked={record.enabled}
              onCheckedChange={(on) => onToggle(record, on)}
            />
            <label htmlFor={`ss-run-enabled-${record.id}`} className="cursor-pointer text-xs font-medium select-none">
              {t('scriptStudio.runs.enabled')}
            </label>
          </div>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onEdit(record.id)}>
              <PencilIcon className="size-3.5" aria-hidden />
              {t('scriptStudio.runs.editScript')}
            </Button>
            {reloadNeeded ? (
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onReload}>
                <RotateCwIcon className="size-3.5" aria-hidden />
                {t('scriptStudio.runs.reload')}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
