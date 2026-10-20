import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NetworkIcon } from 'lucide-react'

import { getInterceptorState } from '@/core/interceptor'
import type { InterceptorState } from '@/core/interceptor'
import { NetworkTab } from '@/tools/api/http-interceptor/NetworkTab'

export default function DevToolsInterceptorPage() {
  const { t } = useTranslation()
  const [state, setState] = useState<InterceptorState | null>(null)
  const [bodies, setBodies] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    void getInterceptorState().then(setState)
  }, [])

  useEffect(() => {
    if (!chrome.devtools?.network?.onRequestFinished) return
    const handler = (request: chrome.devtools.network.Request) => {
      void request.getContent((content) => {
        setBodies((prev) => {
          const next = new Map(prev)
          next.set(request.request.url, content)
          return next
        })
      })
    }
    chrome.devtools.network.onRequestFinished.addListener(handler)
    return () => chrome.devtools.network.onRequestFinished.removeListener(handler)
  }, [])

  if (!state) return null

  return (
    <div className="h-full overflow-y-auto p-3">
      <h1 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <NetworkIcon className="size-4 text-primary" />
        {t('interceptor.title')} — DevTools
      </h1>
      <NetworkTab state={state} devtoolsBodies={bodies} />
    </div>
  )
}
