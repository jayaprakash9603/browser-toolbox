import { useEffect, useMemo, useState } from 'react'
import {
  BanIcon,
  ClockIcon,
  PencilIcon,
  PlusCircleIcon,
  ReplaceIcon,
  ShuffleIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'

import { entryToCurl } from '@/features/interceptor/curl'
import {
  TYPE_FILTERS,
  formatSize,
  matchesTypeFilter,
  type NetworkRow,
  type TypeFilter,
} from '@/features/interceptor/networkModel'
import { CodeEditor } from '@/shared/components/CodeEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'
import type { NetLogEntry } from '@/core/interceptor'

import { JsonTree } from './JsonTree'
import { QuickRuleDialog, type QuickRuleRequest } from './QuickRuleDialog'

const DETAIL_TABS = ['General', 'Headers', 'Payload', 'Response', 'HAR'] as const
type DetailTab = (typeof DETAIL_TABS)[number]

interface Props {
  rows: NetworkRow[]
  onClear: () => void
  preserveLog: boolean
  onPreserveLogChange: (value: boolean) => void
  /** Toggle shown when deep intercept can be attached to the inspected tab. */
  deep?: { active: boolean; onToggle: () => void; error?: string | null }
}

function statusClass(status?: number): string {
  if (!status) return 'text-muted-foreground'
  if (status >= 500) return 'text-red-600'
  if (status >= 400) return 'text-amber-600'
  return ''
}

export function NetworkInspector({ rows, onClear, preserveLog, onPreserveLogChange, deep }: Props) {
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<DetailTab>('General')
  const [dialog, setDialog] = useState<QuickRuleRequest | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [body, setBody] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return rows.filter((r) => matchesTypeFilter(r, typeFilter) && (!q || r.url.toLowerCase().includes(q)))
  }, [rows, filter, typeFilter])

  const selected = rows.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    setBody(null)
    if (!selected || tab !== 'Response') return
    if (!selected.getBody) {
      setBody('')
      return
    }
    let cancelled = false
    void selected.getBody().then((content) => {
      if (!cancelled) setBody(content)
    })
    return () => {
      cancelled = true
    }
  }, [selected, tab])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  const open = (req: Omit<QuickRuleRequest, 'url'>) => selected && setDialog({ ...req, url: selected.url })

  return (
    <div className="flex h-full min-h-0 flex-col text-xs">
      <div className="flex flex-wrap items-center gap-2 border-b px-2 py-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={onClear}>
          <BanIcon /> Clear logs
        </Button>
        <label className="flex cursor-pointer items-center gap-1">
          <input type="checkbox" checked={preserveLog} onChange={(e) => onPreserveLogChange(e.target.checked)} />
          Preserve log
        </label>
        {deep && (
          <Button type="button" variant={deep.active ? 'default' : 'outline'} size="xs" onClick={deep.onToggle}>
            Deep intercept {deep.active ? 'on' : 'off'}
          </Button>
        )}
        {deep?.error && <span className="text-red-600">{deep.error}</span>}
        <span className="ml-auto text-muted-foreground">{visible.length} requests</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter"
          className="h-7 w-44 text-xs"
        />
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={cn(
              'rounded px-1.5 py-0.5 hover:bg-muted',
              typeFilter === t && 'bg-primary/15 font-medium text-primary',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn('min-h-0 overflow-auto', selected ? 'w-1/2 border-r' : 'w-full')}>
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-1 font-medium">URL</th>
                {!selected && (
                  <>
                    <th className="w-16 px-2 font-medium">Method</th>
                    <th className="w-14 px-2 font-medium">Status</th>
                    <th className="w-20 px-2 font-medium">Type</th>
                    <th className="w-16 px-2 font-medium">Size</th>
                    <th className="w-16 px-2 font-medium">Time</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    'cursor-pointer border-b even:bg-muted/30 hover:bg-muted',
                    selectedId === r.id && 'bg-primary text-primary-foreground even:bg-primary hover:bg-primary',
                  )}
                >
                  <td className="truncate px-2 py-1 font-mono" title={r.url}>
                    {r.modified && <span className="mr-1 rounded bg-blue-600 px-1 text-[9px] text-white">RULE</span>}
                    {r.url}
                  </td>
                  {!selected && (
                    <>
                      <td className="px-2">{r.method}</td>
                      <td className={cn('px-2', statusClass(r.status))}>{r.status ?? '…'}</td>
                      <td className="truncate px-2">{r.type}</td>
                      <td className="px-2">{formatSize(r.size)}</td>
                      <td className="px-2">{r.time != null ? `${r.time} ms` : '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              No requests yet. Reload the inspected page to capture traffic.
            </p>
          )}
        </div>

        {selected && (
          <div className="flex min-h-0 w-1/2 flex-col">
            <div className="flex items-center border-b">
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => setSelectedId(null)} aria-label="Close">
                <XIcon />
              </Button>
              {DETAIL_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'border-b-2 px-3 py-1.5 text-[13px]',
                    tab === t ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {tab === 'General' && (
                <div className="space-y-3">
                  <p className="break-all">
                    <b>Request URL:</b> {selected.url}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="xs" onClick={() => open({ kind: 'redirect' })}>
                      <ShuffleIcon /> Redirect to a different URL
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => open({ kind: 'replaceHost' })}>
                      <ReplaceIcon /> Replace host
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => open({ kind: 'replacePart' })}>
                      <PencilIcon /> Replace part of URL
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => open({ kind: 'delay' })}>
                      <ClockIcon /> Delay request
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => open({ kind: 'cancel' })}>
                      <BanIcon /> Cancel request
                    </Button>
                  </div>
                  <p>
                    <b>Method:</b> {selected.method} &nbsp; <b>Status:</b> {selected.status ?? '—'} &nbsp;
                    <b>Type:</b> {selected.type}
                  </p>
                  {selected.appliedRuleIds && selected.appliedRuleIds.length > 0 && (
                    <p>
                      <b>Rules matched:</b> {selected.appliedRuleIds.length}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => void navigator.clipboard.writeText(entryToCurl(selected.raw as NetLogEntry))}
                  >
                    Copy as cURL
                  </Button>
                </div>
              )}

              {tab === 'Headers' && (
                <div className="space-y-4">
                  <HeaderSection
                    title="Request Headers"
                    headers={selected.requestHeaders}
                    onAdd={() => open({ kind: 'requestHeader' })}
                    onEdit={(h) => open({ kind: 'requestHeader', headerName: h.name, headerValue: h.value })}
                    onRemove={(h) => open({ kind: 'requestHeader', headerName: h.name, headerOp: 'remove' })}
                  />
                  <HeaderSection
                    title="Response Headers"
                    headers={selected.responseHeaders}
                    onAdd={() => open({ kind: 'responseHeader' })}
                    onEdit={(h) => open({ kind: 'responseHeader', headerName: h.name, headerValue: h.value })}
                    onRemove={(h) => open({ kind: 'responseHeader', headerName: h.name, headerOp: 'remove' })}
                  />
                </div>
              )}

              {tab === 'Payload' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <b className="text-sm">Query Parameters</b>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="xs" onClick={() => open({ kind: 'addQueryParam' })}>
                        <PlusCircleIcon /> Add query param
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={!selected.queryParams.length}
                        onClick={() =>
                          open({ kind: 'removeQueryParams', queryKeys: selected.queryParams.map((p) => p.name) })
                        }
                      >
                        Remove all query params
                      </Button>
                    </div>
                  </div>
                  {selected.queryParams.map((p, i) => (
                    <p key={`${p.name}${i}`}>
                      <b>{p.name}:</b> {p.value}
                    </p>
                  ))}
                  {selected.postData && (
                    <>
                      <b className="text-sm">Request body</b>
                      <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono">{selected.postData}</pre>
                    </>
                  )}
                </div>
              )}

              {tab === 'Response' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <b className="text-sm">Response Body</b>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        open({ kind: 'editResponse', body: body ?? '', status: selected.status })
                      }
                    >
                      <PencilIcon /> Edit Response Body
                    </Button>
                  </div>
                  {selected.type === 'image' && body ? (
                    <p className="text-muted-foreground">Binary image content (base64 shown below)</p>
                  ) : null}
                  <CodeEditor value={body ?? 'Loading…'} readOnly className="min-h-[220px]" />
                </div>
              )}

              {tab === 'HAR' && <JsonTree value={selected.raw} />}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-foreground px-3 py-1.5 text-background">
          {toast}
        </div>
      )}
      <QuickRuleDialog request={dialog} onClose={() => setDialog(null)} onSaved={setToast} />
    </div>
  )
}

function HeaderSection({
  title,
  headers,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string
  headers: { name: string; value: string }[]
  onAdd: () => void
  onEdit: (h: { name: string; value: string }) => void
  onRemove: (h: { name: string; value: string }) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <b className="text-sm">{title}</b>
        <Button type="button" variant="outline" size="xs" onClick={onAdd}>
          <PlusCircleIcon /> Add {title.startsWith('Request') ? 'request' : 'response'} header
        </Button>
      </div>
      {headers.length === 0 && <p className="text-muted-foreground">No headers</p>}
      {headers.map((h, i) => (
        <div key={`${h.name}${i}`} className="group flex items-start gap-2 py-0.5">
          <p className="min-w-0 flex-1 break-all">
            <b>{h.name}:</b> {h.value}
          </p>
          <button type="button" aria-label={`Edit ${h.name}`} onClick={() => onEdit(h)} className="opacity-60 hover:opacity-100">
            <PencilIcon className="size-3.5" />
          </button>
          <button type="button" aria-label={`Remove ${h.name}`} onClick={() => onRemove(h)} className="opacity-60 hover:opacity-100">
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
