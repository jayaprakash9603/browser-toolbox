import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiClientResponse } from 'postman-lite'

import { formatJson } from '@/core/engines/json'
import { detectResponseFormat } from '@/core/engines/api'
import {
  applyEnabledParams,
  isMutatingMethod,
  validateExplorerDraft,
} from '@/core/interceptor/apiExplorer'
import type { ExplorerAuth, ExplorerBodyMode, ExplorerDraft } from '@/core/interceptor/apiFinderTypes'
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
import { JsonViewer } from './JsonViewer'
import { KvEditor } from './KvEditor'
import { statusBadgeClass } from './MethodBadge'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const REQ_TABS = ['params', 'headers', 'auth', 'body', 'cookies', 'settings'] as const
const RES_TABS = ['pretty', 'raw', 'preview', 'headers', 'cookies', 'timing'] as const

export function ExplorerTab() {
  const { t } = useTranslation()
  const { draft, setDraft, includeSecrets } = useApiWorkspace()
  const { show } = useToast()
  const [reqTab, setReqTab] = useState<(typeof REQ_TABS)[number]>('params')
  const [resTab, setResTab] = useState<(typeof RES_TABS)[number]>('pretty')
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [response, setResponse] = useState<ApiClientResponse | null>(null)

  if (!draft) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center">
        <p className="text-sm font-medium">{t('interceptor.explorer.emptyTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('interceptor.explorer.emptyBody')}</p>
      </div>
    )
  }

  const patch = (next: Partial<ExplorerDraft>) => setDraft({ ...draft, ...next })
  const urlPreview = applyEnabledParams(draft.url, draft.params)

  const run = async () => {
    const invalid = validateExplorerDraft(draft)
    if (invalid) {
      show(invalid, { variant: 'error' })
      return
    }
    setSending(true)
    setResponse(null)
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
      if (!result.ok) show(result.error ?? t('interceptor.explorer.failed'), { variant: 'error' })
    } finally {
      setSending(false)
    }
  }

  const onSend = () => {
    if (isMutatingMethod(draft.method)) setConfirm(true)
    else void run()
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          <Select value={draft.method} onValueChange={(method) => patch({ method })}>
            <SelectTrigger size="sm" className="w-[5.5rem] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.url}
            onChange={(event) => patch({ url: event.target.value })}
            className="h-8 min-w-0 flex-1 font-mono text-xs"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="xs" onClick={onSend} disabled={sending}>
            {sending ? t('interceptor.explorer.sending') : t('interceptor.explorer.send')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={async () => {
              const workspace = await getApiWorkspace()
              const collection =
                workspace.collections[0] ?? (await createCollection(t('interceptor.collections.untitled')))
              await saveRequestToCollection(collection.id, `${draft.method} ${urlPreview}`, draft, { includeSecrets })
              show(t('interceptor.collections.saved'))
            }}
          >
            {t('interceptor.explorer.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() =>
              void openInRequestBuilder(
                entryToCurl(
                  {
                    method: draft.method,
                    url: urlPreview,
                    requestHeaders: draft.headers.map((h) => ({ name: h.key, value: h.value })),
                    requestBody: draft.bodyText,
                  },
                  { includeSecrets },
                ),
              )
            }
          >
            {t('interceptor.explorer.openBuilder')}
          </Button>
          <CopyMenu
            includeSecrets={includeSecrets}
            responseBody={response?.bodyText}
            request={{
              method: draft.method,
              url: urlPreview,
              requestHeaders: draft.headers.map((h) => ({ name: h.key, value: h.value })),
              requestBody: draft.bodyText,
              responseHeaders: (response?.headers ?? []).map(([name, value]) => ({ name, value })),
              status: response?.status,
            }}
          />
        </div>
        <p className="break-all font-mono text-[11px] text-muted-foreground">{urlPreview}</p>
        <p className="text-[11px] text-muted-foreground">{t('interceptor.explorer.replayHint')}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-1">
        {REQ_TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setReqTab(id)}
            className={cn(
              'rounded-md px-2 py-1 text-[11px]',
              reqTab === id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`interceptor.explorer.tab.${id}`)}
          </button>
        ))}
      </div>

      {reqTab === 'params' && <KvEditor rows={draft.params} onChange={(params) => patch({ params })} />}
      {reqTab === 'headers' && <KvEditor rows={draft.headers} onChange={(headers) => patch({ headers })} />}
      {reqTab === 'auth' && <AuthEditor auth={draft.auth} onChange={(auth) => patch({ auth })} />}
      {reqTab === 'body' && <BodyEditor draft={draft} onChange={patch} />}
      {reqTab === 'cookies' && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">{t('interceptor.explorer.cookiesHint')}</p>
          <KvEditor rows={draft.cookies} onChange={(cookies) => patch({ cookies })} />
        </div>
      )}
      {reqTab === 'settings' && (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{t('interceptor.explorer.sendCookies')}</span>
          <Switch checked={draft.sendCookies} onCheckedChange={(sendCookies) => patch({ sendCookies })} />
        </label>
      )}

      <section className="rounded-lg border p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold">{t('interceptor.explorer.response')}</h3>
          {response?.status != null && (
            <span className={cn('font-mono text-xs', statusBadgeClass(response.status))}>
              {response.status} {response.statusText ?? ''}
            </span>
          )}
          {response?.timeMs != null && <span className="text-[11px] text-muted-foreground">{response.timeMs} ms</span>}
          {response?.sizeBytes != null && (
            <span className="text-[11px] text-muted-foreground">{Math.round(response.sizeBytes)} B</span>
          )}
        </div>
        {sending && <p className="text-xs text-muted-foreground">{t('interceptor.explorer.sending')}</p>}
        {response?.error && <p className="text-xs text-red-600 dark:text-red-400">{response.error}</p>}
        {response && !sending && (
          <>
            <div className="mb-2 flex flex-wrap gap-1">
              {RES_TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setResTab(id)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px]',
                    resTab === id ? 'bg-muted font-medium' : 'text-muted-foreground',
                  )}
                >
                  {t(`interceptor.explorer.res.${id}`)}
                </button>
              ))}
            </div>
            <ExplorerResponse view={resTab} response={response} />
          </>
        )}
        {!response && !sending && <p className="text-xs text-muted-foreground">{t('interceptor.explorer.noResponse')}</p>}
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

function AuthEditor({ auth, onChange }: { auth: ExplorerAuth; onChange: (auth: ExplorerAuth) => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <Select
        value={auth.type}
        onValueChange={(type) => {
          if (type === 'none') onChange({ type: 'none' })
          else if (type === 'bearer') onChange({ type: 'bearer', token: '' })
          else if (type === 'basic') onChange({ type: 'basic', username: '', password: '' })
          else if (type === 'apiKey') onChange({ type: 'apiKey', key: 'X-API-Key', value: '', in: 'header' })
          else onChange({ type: 'custom', header: 'Authorization', value: '' })
        }}
      >
        <SelectTrigger size="sm" className="w-40">
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
      {auth.type === 'bearer' && (
        <Input
          type="password"
          value={auth.token}
          onChange={(event) => onChange({ type: 'bearer', token: event.target.value })}
          placeholder="Token"
          className="h-8 text-xs"
        />
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
    <div className="space-y-2">
      <Select value={draft.bodyMode} onValueChange={(bodyMode: ExplorerBodyMode) => onChange({ bodyMode })}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(['none', 'json', 'text', 'urlencoded', 'formdata'] as const).map((mode) => (
            <SelectItem key={mode} value={mode}>
              {t(`interceptor.explorer.body.${mode}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
}: {
  view: (typeof RES_TABS)[number]
  response: ApiClientResponse
}) {
  const { t } = useTranslation()
  const body = response.bodyText ?? ''
  const format = detectResponseFormat(body)
  const cookieHeaders = (response.headers ?? []).filter(([name]) => name.toLowerCase() === 'set-cookie')

  if (view === 'headers') {
    return (
      <ul className="space-y-0.5 font-mono text-[11px]">
        {(response.headers ?? []).map(([name, value], index) => (
          <li key={`${name}${index}`} className="break-all">
            <span className="text-muted-foreground">{name}:</span> {value}
          </li>
        ))}
      </ul>
    )
  }
  if (view === 'cookies') {
    if (!cookieHeaders.length) return <p className="text-xs text-muted-foreground">{t('interceptor.explorer.noCookies')}</p>
    return (
      <ul className="space-y-1 font-mono text-[11px]">
        {cookieHeaders.map(([, value], index) => (
          <li key={index} className="break-all">
            {value}
          </li>
        ))}
      </ul>
    )
  }
  if (view === 'timing') {
    return (
      <p className="text-xs text-muted-foreground">
        {response.timeMs != null ? `${response.timeMs} ms` : t('interceptor.viewer.unavailable')}
      </p>
    )
  }
  if (view === 'raw') {
    return <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">{body}</pre>
  }
  if (view === 'preview') {
    if (format === 'html') {
      return <iframe title="preview" sandbox="" className="h-48 w-full rounded-md border bg-background" srcDoc={body} />
    }
    return <p className="text-xs text-muted-foreground">{t('interceptor.explorer.previewUnavailable')}</p>
  }
  if (format === 'json' || body.trim().startsWith('{') || body.trim().startsWith('[')) {
    return <JsonViewer value={body} />
  }
  return <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">{body}</pre>
}
