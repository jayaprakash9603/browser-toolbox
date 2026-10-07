import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircleIcon, SendIcon } from 'lucide-react'

import {
  HTTP_METHODS,
  parseRequestHeaders,
  parseRequestUrl,
  redactJsonSecrets,
  redactResponseHeaders,
  sendHttpRequest,
  type HttpMethod,
  type HttpResponse,
} from '@/core/network/httpClient'
import { requestHostAccess } from '@/core/permissions/originPermissions'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { TextEditor } from '@/shared/components/TextEditor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useQaTool } from '../_shared'

export default function ApiRequestBuilderTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.api-request-builder')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [headers, setHeaders] = useState('{}')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<HttpResponse | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    setError('')
    setResponse(null)
    try {
      const parsedUrl = parseRequestUrl(url)
      const parsedHeaders = parseRequestHeaders(headers)
      if (!(await requestHostAccess(parsedUrl.href))) {
        throw new Error(t('qa.apiPermissionDenied'))
      }
      setResponse(
        await sendHttpRequest(
          { url: parsedUrl.href, method, headers: parsedHeaders, body },
        ),
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : t('qa.apiRequestFailed'),
      )
    } finally {
      setSending(false)
    }
  }

  const displayedBody = response ? redactJsonSecrets(response.body) : ''

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-muted-foreground">{t('qa.apiPrivacyNotice')}</p>
        <div className="flex gap-2">
          <Select value={method} onValueChange={(value) => setMethod(value as HttpMethod)}>
            <SelectTrigger className="w-24" aria-label={t('qa.apiMethod')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t('qa.apiUrlPlaceholder')}
            aria-label={t('qa.apiUrl')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !sending) void send()
            }}
          />
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium">
          {t('qa.apiHeaders')}
          <TextEditor
            value={headers}
            onChange={setHeaders}
            minRows={3}
            ariaLabel={t('qa.apiHeaders')}
            placeholder={'{\n  "Accept": "application/json"\n}'}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          {t('qa.apiBody')}
          <TextEditor
            value={body}
            onChange={setBody}
            minRows={4}
            ariaLabel={t('qa.apiBody')}
            placeholder={t('qa.apiBodyPlaceholder')}
          />
        </label>
        <Button size="sm" onClick={() => void send()} disabled={sending || !url.trim()}>
          {sending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
          {sending ? t('qa.apiSending') : t('qa.apiSend')}
        </Button>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {response && (
          <section aria-label={t('qa.apiResponse')} className="flex flex-col gap-2 border-t pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {t('qa.apiResponse')}: {response.status} {response.statusText}
              </span>
              <span className="text-muted-foreground">
                {t('qa.apiDuration', { duration: response.durationMs })}
              </span>
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-medium">
                {t('qa.apiResponseHeaders')}
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-[10px]">
                {JSON.stringify(redactResponseHeaders(response.headers), null, 2)}
              </pre>
            </details>
            <div className="flex flex-col gap-1 text-xs font-medium">
              {t('qa.apiResponseBody')}
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 font-mono text-[11px]">
                {displayedBody || t('qa.apiEmptyBody')}
              </pre>
            </div>
          </section>
        )}
      </div>
    </ToolPage>
  )
}