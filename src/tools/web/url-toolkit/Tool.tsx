import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EraserIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import {
  cleanUrl,
  decodeUrlComponent,
  encodeUrlComponent,
  getQueryParams,
  parseUrl,
  setQueryParam,
  deleteQueryParam,
} from '@/core/engines/url'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useWebTool } from '../_shared'

const EXAMPLE = 'https://shop.example.com/products?id=42&color=red&utm_source=newsletter#reviews'

export default function UrlToolkitTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.url-toolkit')
  const [tab, setTab] = useState<'parse' | 'encode' | 'clean'>('parse')
  const [input, setInput] = useState('')
  const [encodeInput, setEncodeInput] = useState('')

  const parsed = useMemo(() => (input.trim() ? parseUrl(input) : null), [input])
  const url = parsed?.ok ? parsed.value : null
  const params = url ? getQueryParams(url) : []
  const cleaned = useMemo(() => (url ? cleanUrl(url) : null), [url])
  const [editKey, setEditKey] = useState('')
  const [editValue, setEditValue] = useState('')

  const applyUrl = (next: URL) => setInput(next.toString())
  const encoded = useMemo(() => (encodeInput ? encodeUrlComponent(encodeInput) : ''), [encodeInput])
  const decoded = useMemo(
    () => (encodeInput ? decodeUrlComponent(encodeInput) : null),
    [encodeInput],
  )

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="parse">{t('web.tabParse')}</TabsTrigger>
            <TabsTrigger value="encode">{t('web.tabEncode')}</TabsTrigger>
            <TabsTrigger value="clean">{t('web.tabClean')}</TabsTrigger>
          </TabsList>

        <TabsContent value="parse" className="mt-0">
          <div className="flex flex-col gap-2">
            <TextEditor
              value={input}
              onChange={setInput}
              placeholder={EXAMPLE}
              ariaLabel={t('web.urlInput')}
              minRows={3}
              mono
            />
            {parsed && !parsed.ok && <JsonErrorView message={parsed.error} />}
            {url && (
              <>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <Part label={t('web.protocol')} value={url.protocol.replace(':', '')} />
                  <Part label={t('web.host')} value={url.host} />
                  <Part label={t('web.port')} value={url.port || '—'} />
                  <Part label={t('web.path')} value={url.pathname} />
                  <Part label={t('web.fragment')} value={url.hash || '—'} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {t('web.params', { count: params.length })}
                    </span>
                    <CopyButton text={url.toString()} size="xs" />
                  </div>
                  <div className="space-y-1">
                    {params.map(({ key, value }) => (
                      <div
                        key={key}
                        className="flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-1"
                      >
                        <code className="text-[11px] font-medium text-primary">{key}</code>
                        <span className="text-muted-foreground">=</span>
                        <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
                          {value}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => url && applyUrl(deleteQueryParam(url, key))}
                          aria-label={t('common.delete')}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 pt-1">
                      <Input
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        placeholder={t('web.paramKey')}
                        className="h-7 flex-1 font-mono text-[11px]"
                        aria-label={t('web.paramKey')}
                      />
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={t('web.paramValue')}
                        className="h-7 flex-1 font-mono text-[11px]"
                        aria-label={t('web.paramValue')}
                      />
                      <Button
                        size="icon-sm"
                        onClick={() => {
                          if (url && editKey) {
                            applyUrl(setQueryParam(url, editKey, editValue))
                            setEditKey('')
                            setEditValue('')
                          }
                        }}
                        disabled={!editKey}
                        aria-label={t('web.addParam')}
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="encode" className="mt-0">
          <div className="flex flex-col gap-2">
            <TextEditor
              value={encodeInput}
              onChange={setEncodeInput}
              placeholder="a b&c=d"
              ariaLabel={t('web.encodeInput')}
              minRows={3}
            />
            {encodeInput && (
              <>
                <div className="flex items-center justify-between rounded border bg-muted/40 p-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t('web.encoded')}</p>
                    <code className="font-mono text-[11px]">{encoded}</code>
                  </div>
                  <CopyButton text={encoded} />
                </div>
                {decoded?.ok && decoded.value !== encodeInput && (
                  <div className="flex items-center justify-between rounded border bg-muted/40 p-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('web.decoded')}</p>
                      <code className="font-mono text-[11px]">{decoded.value}</code>
                    </div>
                    <CopyButton text={decoded.value} />
                  </div>
                )}
                {decoded && !decoded.ok && <JsonErrorView message={decoded.error} />}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clean" className="mt-0">
          <div className="flex flex-col gap-2">
            <TextEditor
              value={input}
              onChange={setInput}
              placeholder={EXAMPLE}
              ariaLabel={t('web.urlInput')}
              minRows={3}
              mono
            />
            {cleaned && (
              <>
                {cleaned.removed.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('web.noTracking')}</p>
                ) : (
                  <div className="rounded border border-amber-500/40 bg-amber-500/5 p-2 text-[11px]">
                    {t('web.removedParams')}{' '}
                    <span className="font-medium">{cleaned.removed.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded border bg-muted/40 p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
                    {cleaned.url.toString()}
                  </code>
                  <div className="flex gap-1">
                    <CopyButton text={cleaned.url.toString()} />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setInput('')}
                      aria-label={t('common.clear')}
                    >
                      <EraserIcon />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}

function Part({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/40 p-1.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-[11px]">{value}</p>
    </div>
  )
}
