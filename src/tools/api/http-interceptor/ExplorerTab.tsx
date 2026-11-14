import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiClientResponse } from 'postman-lite'
import {
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  HardDriveIcon,
  InboxIcon,
  InfoIcon,
  Loader2Icon,
  LockIcon,
  SaveIcon,
  SendIcon,
  TriangleAlertIcon,
  WrapTextIcon,
} from 'lucide-react'

import { formatJson } from '@/core/engines/json'
import { detectResponseFormat } from '@/core/engines/api'
import {
  applyEnabledParams,
  isMutatingMethod,
  validateExplorerDraft,
} from '@/core/interceptor/apiExplorer'
import type { ExplorerAuth, ExplorerDraft } from '@/core/interceptor/apiFinderTypes'
import { createCollection, getApiWorkspace, saveRequestToCollection } from '@/core/interceptor/apiCollections'
import { appendApiHistory } from '@/core/interceptor/apiHistory'
import { useApiWorkspace } from '@/features/interceptor/ApiWorkspaceContext'
import { openInRequestBuilder } from '@/features/interceptor/openInRequestBuilder'
import { sendExplorerRequest } from '@/features/interceptor/sendExplorerRequest'
import { entryToCurl } from '@/features/interceptor/curl'
import { CodeEditor } from '@/shared/components/CodeEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { useToast } from '@/shared/components/toast/useToast'
import { cn } from '@/shared/utils/cn'

import { ConfirmDestructiveDialog } from './ConfirmDestructiveDialog'
import { CopyMenu } from './CopyMenu'
import {
  contentTypeFromHeaders,
  countEnabledKv,
  explorerEditorLanguage,
  formatExplorerDuration,
  formatExplorerSize,
  prettyLanguageLabel,
  protocolFromUrl,
  statusPillClass,
} from './explorerFormat'
import { KvEditor } from './KvEditor'
import { METHOD_TEXT_CLASS } from './MethodBadge'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const REQ_TABS = ['params', 'headers', 'auth', 'body', 'cookies', 'settings'] as const
const RES_TABS = ['pretty', 'raw', 'preview', 'headers', 'cookies', 'timing'] as const
const BODY_MODES = ['none', 'json', 'text', 'urlencoded', 'formdata'] as const
const LARGE_BODY = 400_000

const shortcutMod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

export function ExplorerTab() {
  const { t } = useTranslation()
  const { draft, setDraft, includeSecrets } = useApiWorkspace()
  const { show } = useToast()
  const [reqTab, setReqTab] = useState<(typeof REQ_TABS)[number]>('params')
  const [resTab, setResTab] = useState<(typeof RES_TABS)[number]>('pretty')
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [response, setResponse] = useState<ApiClientResponse | null>(null)
  const [wrap, setWrap] = useState(false)
  const [copied, setCopied] = useState(false)

  const urlPreview = draft ? applyEnabledParams(draft.url, draft.params) : ''

  const run = useCallback(async () => {
    if (!draft) return
    const invalid = validateExplorerDraft(draft)
    if (invalid) {
      show(invalid, { variant: 'error' })
      return
    }
    setSending(true)
    setResponse(null)
    setResTab('pretty')
    try {
      const result = await sendExplorerRequest(draft)
      setResponse(result)
      const blocked = /not granted|CORS|Failed to fetch|blocked/i.test(result.error ?? '')
      await appendApiHistory(
        {
          id: crypto.randomUUID(),
          at: Date.now(),
          method: draft.method,
          url: urlPreview,
          status: result.status,
          statusText: result.statusText,
          durationMs: result.timeMs,
          sizeBytes: result.sizeBytes,
          result: result.ok ? 'ok' : blocked ? 'blocked' : 'error',
          error: result.error,
          draft,
        },
        undefined,
        includeSecrets,
      )
      if (!result.ok && /not granted|Allow it/i.test(result.error ?? '')) {
        show(result.error ?? t('interceptor.explorer.failed'), { variant: 'error' })
      }
    } finally {
      setSending(false)
    }
  }, [draft, includeSecrets, show, t, urlPreview])

  const onSend = useCallback(() => {
    if (!draft || sending) return
    if (isMutatingMethod(draft.method)) setConfirm(true)
    else void run()
  }, [draft, run, sending])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-explorer-skip-send]')) return
      event.preventDefault()
      onSend()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSend])

  const saveRequest = useCallback(async () => {
    if (!draft) return
    const workspace = await getApiWorkspace()
    const collection = workspace.collections[0] ?? (await createCollection(t('interceptor.collections.untitled')))
    await saveRequestToCollection(collection.id, `${draft.method} ${urlPreview}`, draft, { includeSecrets })
    show(t('interceptor.collections.saved'))
  }, [draft, includeSecrets, show, t, urlPreview])

  const openBuilder = useCallback(() => {
    if (!draft) return
    void openInRequestBuilder(
      entryToCurl(
        {
          method: draft.method,
          url: urlPreview,
          requestHeaders: draft.headers.map((header) => ({ name: header.key, value: header.value })),
          requestBody: draft.bodyText,
        },
        { includeSecrets },
      ),
    )
  }, [draft, includeSecrets, urlPreview])

  const copyBody = useCallback(async () => {
    const body = response?.bodyText
    if (!body) return
    await navigator.clipboard.writeText(body)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [response?.bodyText])

  if (!draft) {
    return (
      <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <ExplorerEmptyState />
      </div>
    )
  }

  const patch = (next: Partial<ExplorerDraft>) => setDraft({ ...draft, ...next })
  const protocol = protocolFromUrl(draft.url)
  const paramCount = countEnabledKv(draft.params)
  const headerCount = countEnabledKv(draft.headers)
  const failed = Boolean(response && !sending && (response.error || (response.status != null && response.status >= 400)))

  return (
    <div className="flex min-h-[36rem] min-w-0 flex-1 flex-col rounded-xl border bg-card shadow-sm">
      <section className="space-y-2 border-b p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border bg-muted/30 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
            <Select value={draft.method} onValueChange={(method) => patch({ method })}>
              <SelectTrigger
                className={cn(
                  'h-10 w-[7rem] shrink-0 rounded-none border-0 bg-transparent px-3.5 font-mono text-xs font-bold shadow-none hover:bg-transparent focus-visible:ring-0 sm:text-sm',
                  METHOD_TEXT_CLASS[draft.method] ?? 'text-slate-600',
                )}
                aria-label={t('interceptor.explorer.method')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((method) => (
                  <SelectItem key={method} value={method} className={cn('font-mono font-bold', METHOD_TEXT_CLASS[method])}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px shrink-0 bg-border" />
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
              <Input
                value={draft.url}
                onChange={(event) => patch({ url: event.target.value })}
                placeholder="https://api.example.com/v1/resource"
                spellCheck={false}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault()
                    onSend()
                  }
                }}
                className="h-10 border-0 bg-transparent px-0 font-mono text-xs shadow-none hover:border-transparent focus-visible:border-transparent focus-visible:ring-0 sm:text-[13px]"
              />
              {protocol ? (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px]',
                    protocol === 'https'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
                  )}
                >
                  {protocol === 'https' ? <LockIcon className="size-3" /> : null}
                  {protocol}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" size="sm" className="h-10 flex-1 px-5 lg:flex-none" onClick={onSend} disabled={sending}>
              {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              {sending ? t('interceptor.explorer.sending') : t('interceptor.explorer.send')}
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => void saveRequest()} title={t('interceptor.explorer.save')}>
              <SaveIcon />
              <span className="hidden sm:inline">{t('interceptor.explorer.save')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={openBuilder}
              title={t('interceptor.explorer.openBuilder')}
            >
              <ExternalLinkIcon />
              <span className="hidden md:inline">{t('interceptor.explorer.openBuilder')}</span>
            </Button>
            <CopyMenu
              size="sm"
              className="h-10"
              includeSecrets={includeSecrets}
              responseBody={response?.bodyText}
              request={{
                method: draft.method,
                url: urlPreview,
                requestHeaders: draft.headers.map((header) => ({ name: header.key, value: header.value })),
                requestBody: draft.bodyText,
                responseHeaders: (response?.headers ?? []).map(([name, value]) => ({ name, value })),
                status: response?.status,
              }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-[12px] text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 leading-snug">{t('interceptor.explorer.replayHint')}</span>
        </div>
      </section>

      <section className="flex max-h-[min(22rem,46vh)] min-h-[11rem] shrink-0 flex-col overflow-hidden border-b">
        <div className="flex items-center justify-between gap-3 overflow-x-auto border-b px-2 sm:px-4">
          <div className="flex items-center">
            {REQ_TABS.map((id) => {
              const count = id === 'params' ? paramCount : id === 'headers' ? headerCount : null
              const active = reqTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReqTab(id)}
                  className={cn(
                    'relative flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs transition sm:text-[13px]',
                    active
                      ? 'border-primary font-semibold text-primary'
                      : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`interceptor.explorer.tab.${id}`)}
                  {count != null ? (
                    <span
                      className={cn(
                        'inline-flex size-4 items-center justify-center rounded-full font-mono text-[10px] font-bold',
                        active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <p className="hidden shrink-0 items-center gap-1 pr-1 text-[11px] text-muted-foreground sm:flex">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{shortcutMod}</kbd>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            {t('interceptor.explorer.sendShortcut')}
          </p>
        </div>

        <div className="min-h-[8.5rem] overflow-y-auto p-4">
          {reqTab === 'params' && (
            <KvEditor
              rows={draft.params}
              onChange={(params) => patch({ params })}
              footerHint={t('interceptor.explorer.paramsSynced')}
            />
          )}
          {reqTab === 'headers' && (
            <KvEditor
              rows={draft.headers}
              onChange={(headers) => patch({ headers })}
              keyLabel={t('interceptor.explorer.col.headerKey')}
              valueLabel={t('interceptor.explorer.col.headerValue')}
            />
          )}
          {reqTab === 'auth' && <AuthEditor auth={draft.auth} onChange={(auth) => patch({ auth })} />}
          {reqTab === 'body' && <BodyEditor draft={draft} onChange={patch} />}
          {reqTab === 'cookies' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('interceptor.explorer.cookiesHint')}</p>
              <KvEditor rows={draft.cookies} onChange={(cookies) => patch({ cookies })} />
            </div>
          )}
          {reqTab === 'settings' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
              <div className="min-w-0">
                <div className="text-xs font-medium">{t('interceptor.explorer.sendCookies')}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{t('interceptor.explorer.sendCookiesHint')}</div>
              </div>
              <Switch checked={draft.sendCookies} onCheckedChange={(sendCookies) => patch({ sendCookies })} />
            </div>
          )}
        </div>
      </section>

      <div
        className="flex h-2 shrink-0 items-center justify-center border-y bg-muted/50"
        title={t('interceptor.explorer.resizeHint')}
        aria-hidden
      >
        <div className="h-1 w-8 rounded-full bg-border" />
      </div>

      <section className="flex min-h-[20rem] flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold tracking-wider uppercase sm:text-sm">{t('interceptor.explorer.response')}</h3>
            {sending ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                <span className="size-2 animate-ping rounded-full bg-amber-500" />
                {t('interceptor.explorer.waiting')}
              </span>
            ) : null}
            {!sending && response?.status != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold',
                  statusPillClass(response.status),
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    response.status >= 400 ? 'bg-red-500' : response.status >= 300 ? 'bg-sky-500' : 'bg-emerald-500',
                  )}
                />
                {response.status} {response.statusText ?? ''}
              </span>
            ) : null}
            {!sending && response?.timeMs != null ? (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                <ClockIcon className="size-3" />
                {formatExplorerDuration(response.timeMs)}
              </span>
            ) : null}
            {!sending && response?.sizeBytes != null ? (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                <HardDriveIcon className="size-3" />
                {formatExplorerSize(response.sizeBytes)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5 text-xs font-medium">
            {RES_TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setResTab(id)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition',
                  resTab === id
                    ? 'bg-background font-semibold text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(`interceptor.explorer.res.${id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex min-h-[16rem] flex-1 flex-col overflow-y-auto bg-muted/20 p-4">
          {sending ? <ExplorerSendingState host={hostFromUrl(draft.url)} /> : null}
          {!sending && !response ? <ExplorerIdleState /> : null}
          {!sending && response ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {failed ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 dark:border-red-900/50 dark:bg-red-950/40">
                  <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-red-800 sm:text-sm dark:text-red-300">
                      {response.status != null
                        ? `${response.status} ${response.statusText || t('interceptor.explorer.failed')}`
                        : t('interceptor.explorer.failed')}
                    </h4>
                    <p className="mt-0.5 break-words text-xs text-red-700 dark:text-red-400">
                      {response.error || t('interceptor.explorer.replayHint')}
                    </p>
                  </div>
                </div>
              ) : null}
              <ExplorerResponse
                view={resTab}
                response={response}
                wrap={wrap}
                onToggleWrap={() => setWrap((value) => !value)}
                copied={copied}
                onCopy={() => void copyBody()}
              />
            </div>
          ) : null}
        </div>
      </section>

      <ConfirmDestructiveDialog
        open={confirm}
        method={draft.method}
        url={urlPreview}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          void run()
        }}
      />
    </div>
  )
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url || 'host'
  }
}

function ExplorerEmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <InboxIcon className="size-6" />
      </div>
      <h3 className="text-sm font-semibold">{t('interceptor.explorer.emptyTitle')}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{t('interceptor.explorer.emptyBody')}</p>
    </div>
  )
}

function ExplorerIdleState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-8 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <InfoIcon className="size-6" />
      </div>
      <h3 className="text-sm font-semibold">{t('interceptor.explorer.noResponseTitle')}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{t('interceptor.explorer.noResponse')}</p>
    </div>
  )
}

function ExplorerSendingState({ host }: { host: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border bg-card p-6">
      <div className="mx-auto w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Loader2Icon className="size-6 animate-spin" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t('interceptor.explorer.connecting', { host })}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{t('interceptor.explorer.connectingHint')}</p>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
          <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-muted" />
          <div className="mx-auto h-3 w-3/5 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{children}</label>
}

function AuthEditor({ auth, onChange }: { auth: ExplorerAuth; onChange: (auth: ExplorerAuth) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="w-full shrink-0 space-y-1 sm:w-44">
        <FieldLabel>{t('interceptor.explorer.authType')}</FieldLabel>
        <Select
          value={auth.type}
          onValueChange={(type) => {
            if (type === 'none') onChange({ type: 'none' })
            else if (type === 'bearer') onChange({ type: 'bearer', token: auth.type === 'bearer' ? auth.token : '' })
            else if (type === 'basic') onChange({ type: 'basic', username: '', password: '' })
            else if (type === 'apiKey') onChange({ type: 'apiKey', key: 'X-API-Key', value: '', in: 'header' })
            else onChange({ type: 'custom', header: 'Authorization', value: '' })
          }}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('interceptor.auth.none')}</SelectItem>
            <SelectItem value="bearer">{t('interceptor.auth.bearer')}</SelectItem>
            <SelectItem value="basic">{t('interceptor.auth.basic')}</SelectItem>
            <SelectItem value="apiKey">{t('interceptor.auth.apiKey')}</SelectItem>
            <SelectItem value="custom">{t('interceptor.auth.custom')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {auth.type === 'bearer' && (
          <>
            <FieldLabel>{t('interceptor.explorer.tokenValue')}</FieldLabel>
            <Input
              type="password"
              value={auth.token}
              onChange={(event) => onChange({ type: 'bearer', token: event.target.value })}
              placeholder="Paste bearer token…"
              className="h-8 font-mono text-xs"
            />
          </>
        )}
        {auth.type === 'basic' && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={auth.username}
              onChange={(event) => onChange({ ...auth, username: event.target.value })}
              placeholder="Username"
              className="h-8 text-xs"
            />
            <Input
              type="password"
              value={auth.password}
              onChange={(event) => onChange({ ...auth, password: event.target.value })}
              placeholder="Password"
              className="h-8 text-xs"
            />
          </div>
        )}
        {auth.type === 'apiKey' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={auth.key}
                onChange={(event) => onChange({ ...auth, key: event.target.value })}
                placeholder="Header / param name"
                className="h-8 text-xs"
              />
              <Input
                type="password"
                value={auth.value}
                onChange={(event) => onChange({ ...auth, value: event.target.value })}
                placeholder="Value"
                className="h-8 text-xs"
              />
            </div>
            <Select value={auth.in} onValueChange={(value: 'header' | 'query') => onChange({ ...auth, in: value })}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">{t('interceptor.auth.inHeader')}</SelectItem>
                <SelectItem value="query">{t('interceptor.auth.inQuery')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {auth.type === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={auth.header}
              onChange={(event) => onChange({ ...auth, header: event.target.value })}
              placeholder="Header"
              className="h-8 text-xs"
            />
            <Input
              type="password"
              value={auth.value}
              onChange={(event) => onChange({ ...auth, value: event.target.value })}
              placeholder="Value"
              className="h-8 text-xs"
            />
          </div>
        )}
        {auth.type === 'none' && <p className="pt-6 text-xs text-muted-foreground">{t('interceptor.auth.none')}</p>}
      </div>
    </div>
  )
}

function BodyEditor({
  draft,
  onChange,
}: {
  draft: ExplorerDraft
  onChange: (patch: Partial<ExplorerDraft>) => void
}) {
  const { t } = useTranslation()
  const format = () => {
    const result = formatJson(draft.bodyText)
    if (result.ok) onChange({ bodyText: result.value })
  }
  return (
    <div className="space-y-3" data-explorer-skip-send>
      <div role="radiogroup" aria-label={t('interceptor.explorer.tab.body')} className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {BODY_MODES.map((mode) => {
          const active = draft.bodyMode === mode
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ bodyMode: mode })}
              className={cn('text-xs transition', active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {t(`interceptor.explorer.body.${mode}`)}
            </button>
          )
        })}
      </div>
      {(draft.bodyMode === 'json' || draft.bodyMode === 'text' || draft.bodyMode === 'formdata') && (
        <>
          {draft.bodyMode === 'json' && (
            <Button type="button" variant="outline" size="xs" onClick={format}>
              {t('interceptor.explorer.formatJson')}
            </Button>
          )}
          <CodeEditor
            value={draft.bodyText}
            onChange={(bodyText) => onChange({ bodyText })}
            language={draft.bodyMode === 'json' ? 'json' : 'text'}
            className="min-h-[180px]"
          />
        </>
      )}
      {draft.bodyMode === 'urlencoded' && (
        <KvEditor rows={draft.formFields} onChange={(formFields) => onChange({ formFields })} />
      )}
    </div>
  )
}

function ExplorerResponse({
  view,
  response,
  wrap,
  onToggleWrap,
  copied,
  onCopy,
}: {
  view: (typeof RES_TABS)[number]
  response: ApiClientResponse
  wrap: boolean
  onToggleWrap: () => void
  copied: boolean
  onCopy: () => void
}) {
  const { t } = useTranslation()
  const body = response.bodyText ?? ''
  const format = detectResponseFormat(body)
  const language = useMemo(
    () => explorerEditorLanguage(body, contentTypeFromHeaders(response.headers), format),
    [body, format, response.headers],
  )
  const display = body.length > LARGE_BODY ? `${body.slice(0, LARGE_BODY)}\n…` : body
  const lines = display ? display.split('\n').length : 0
  const cookieHeaders = (response.headers ?? []).filter(([name]) => name.toLowerCase() === 'set-cookie')

  if (view === 'headers') {
    return (
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card p-3">
        <ul className="space-y-1 font-mono text-[12px]">
          {(response.headers ?? []).map(([name, value], index) => (
            <li key={`${name}${index}`} className="break-all">
              <span className="text-muted-foreground">{name}:</span> {value}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (view === 'cookies') {
    return (
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card p-3">
        {!cookieHeaders.length ? (
          <p className="text-xs text-muted-foreground">{t('interceptor.explorer.noCookies')}</p>
        ) : (
          <ul className="space-y-1 font-mono text-[12px]">
            {cookieHeaders.map(([, value], index) => (
              <li key={index} className="break-all">
                {value}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  if (view === 'timing') {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border bg-card p-6">
        <p className="font-mono text-sm text-muted-foreground">
          {response.timeMs != null ? formatExplorerDuration(response.timeMs) : t('interceptor.viewer.unavailable')}
        </p>
      </div>
    )
  }
  if (view === 'raw') {
    return (
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-card p-3 font-mono text-[12px]">
        {body}
      </pre>
    )
  }
  if (view === 'preview') {
    if (format === 'html') {
      return <iframe title="preview" sandbox="" className="min-h-[16rem] w-full flex-1 rounded-xl border bg-background" srcDoc={body} />
    }
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border bg-card p-6">
        <p className="text-xs text-muted-foreground">{t('interceptor.explorer.previewUnavailable')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0B1220] shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-[#080D17] px-3 py-2 font-mono text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
            <span className="size-1.5 rounded-full bg-amber-400" />
            {prettyLanguageLabel(language)}
          </span>
          <span className="truncate text-[11px] text-zinc-500">
            UTF-8{lines ? ` • ${t('interceptor.explorer.lineCount', { count: lines })}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleWrap}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-zinc-800 hover:text-white',
              wrap && 'text-sky-300',
            )}
            title={t('interceptor.explorer.wrap')}
          >
            <WrapTextIcon className="size-3.5" />
            {t('interceptor.explorer.wrap')}
          </button>
          <div className="mx-1 h-3 w-px bg-zinc-800" />
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            title={t('interceptor.copy.response')}
          >
            <CopyIcon className="size-3.5" />
            {copied ? t('interceptor.explorer.copied') : t('interceptor.explorer.copyBody')}
          </button>
        </div>
      </div>
      <CodeEditor
        value={display}
        readOnly
        wrap={wrap}
        language={language}
        appearance="dark"
        className="min-h-[14rem] flex-1 rounded-none border-0 bg-transparent shadow-none [--background:#0B1220] [--foreground:#F1F5F9] [--muted-foreground:#94A3B8] [--border:#1E293B] [--card:#080D17] [--editor-gutter:#080D17]"
      />
    </div>
  )
}
