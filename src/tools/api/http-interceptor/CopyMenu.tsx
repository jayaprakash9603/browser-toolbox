import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  entryToCurl,
  entryToFetch,
  entryToRequestJson,
  headersToText,
  type CopyableRequest,
} from '@/features/interceptor/curl'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useToast } from '@/shared/components/toast/useToast'

export function CopyMenu({
  request,
  includeSecrets,
  responseBody,
}: {
  request: CopyableRequest
  includeSecrets: boolean
  responseBody?: string
}) {
  const { t } = useTranslation()
  const { show } = useToast()
  const [copied, setCopied] = useState(false)
  const options = { includeSecrets }

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    show(t('interceptor.copy.done', { label }))
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="xs">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {t('interceptor.copy.menu')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void copy(request.url, 'URL')}>{t('interceptor.copy.url')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(entryToCurl(request, options), 'cURL')}>
          {t('interceptor.copy.curl')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(entryToFetch(request, options), 'fetch')}>
          {t('interceptor.copy.fetch')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(entryToRequestJson(request, options), 'JSON')}>
          {t('interceptor.copy.json')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void copy(headersToText(request.requestHeaders, options), t('interceptor.copy.reqHeaders'))}
        >
          {t('interceptor.copy.reqHeaders')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void copy(headersToText(request.responseHeaders, options), t('interceptor.copy.resHeaders'))}
        >
          {t('interceptor.copy.resHeaders')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!responseBody}
          onSelect={() => responseBody && void copy(responseBody, t('interceptor.copy.response'))}
        >
          {t('interceptor.copy.response')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
