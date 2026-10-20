import { useEffect, useState } from 'react'

import type { HeaderChange } from '@/core/interceptor'
import { hostOf, saveQuickRule, type QuickRuleKind } from '@/features/interceptor/quickRules'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'

export interface QuickRuleRequest {
  kind: QuickRuleKind
  url: string
  headerName?: string
  headerValue?: string
  headerOp?: HeaderChange['operation']
  queryKeys?: string[]
  body?: string
  status?: number
}

const TITLES: Record<QuickRuleKind, string> = {
  redirect: 'Redirect to a different URL',
  replaceHost: 'Replace host',
  replacePart: 'Replace part of URL',
  delay: 'Delay request',
  cancel: 'Cancel request',
  requestHeader: 'Request header',
  responseHeader: 'Response header',
  addQueryParam: 'Add query param',
  removeQueryParams: 'Remove all query params',
  editResponse: 'Edit response body',
}

interface Props {
  request: QuickRuleRequest | null
  onClose: () => void
  onSaved: (message: string) => void
}

export function QuickRuleDialog({ request, onClose, onSaved }: Props) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [status, setStatus] = useState('200')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!request) return
    setSaving(false)
    switch (request.kind) {
      case 'redirect':
        setA(request.url)
        setB('')
        break
      case 'replaceHost':
        setA(hostOf(request.url))
        setB('')
        break
      case 'replacePart':
        setA('')
        setB('')
        break
      case 'delay':
        setA('2000')
        break
      case 'requestHeader':
      case 'responseHeader':
        setA(request.headerName ?? '')
        setB(request.headerValue ?? '')
        break
      case 'editResponse':
        setA(request.body ?? '')
        setStatus(String(request.status ?? 200))
        break
      default:
        setA('')
        setB('')
    }
  }, [request])

  if (!request) return null
  const { kind } = request
  const remove = request.headerOp === 'remove'

  const save = async () => {
    setSaving(true)
    await saveQuickRule(kind, {
      url: request.url,
      a,
      b,
      headerOp: request.headerOp,
      queryKeys: request.queryKeys,
      status: Number(status) || undefined,
    })
    chrome.runtime.sendMessage({ type: 'INTERCEPTOR_SYNC' }).catch(() => undefined)
    onSaved(`${TITLES[kind]} rule saved`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {remove ? `Remove ${request.headerName}` : TITLES[kind]}
          </DialogTitle>
        </DialogHeader>
        <p className="break-all font-mono text-[11px] text-muted-foreground">{request.url}</p>
        <div className="flex flex-col gap-2">
          {kind === 'redirect' && <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Destination URL" />}
          {kind === 'replaceHost' && (
            <>
              <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Host to replace" />
              <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="New host (e.g. staging.example.com)" />
            </>
          )}
          {kind === 'replacePart' && (
            <>
              <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Part of URL to replace" />
              <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Replace with" />
            </>
          )}
          {kind === 'delay' && (
            <Input type="number" value={a} onChange={(e) => setA(e.target.value)} placeholder="Delay in ms" />
          )}
          {kind === 'cancel' && <p className="text-sm">Requests to this exact URL will be blocked.</p>}
          {(kind === 'requestHeader' || kind === 'responseHeader') && (
            <>
              <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Header name" disabled={!!request.headerName} />
              {!remove && <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Header value" />}
            </>
          )}
          {kind === 'addQueryParam' && (
            <>
              <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Param name" />
              <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Param value" />
            </>
          )}
          {kind === 'removeQueryParams' && (
            <p className="text-sm">Removes: {(request.queryKeys ?? []).join(', ') || 'no params'}</p>
          )}
          {kind === 'editResponse' && (
            <>
              <Input type="number" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status" />
              <Textarea value={a} onChange={(e) => setA(e.target.value)} rows={10} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">
                Applies to fetch/XHR. Turn on Deep intercept to also override images, scripts and documents.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            Save rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
