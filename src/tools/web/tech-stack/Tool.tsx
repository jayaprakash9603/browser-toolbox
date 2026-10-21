import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import type { TechHit } from '@/core/engines/techStack/detect'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { useWebTool } from '../_shared'
import { sendToActiveTab } from '../tabMessaging'

export default function TechStackTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.tech-stack')
  const [hits, setHits] = useState<TechHit[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    const data = await sendToActiveTab<TechHit[]>({ type: 'GET_TECH_STACK' })
    setHits(data ?? [])
    setLoaded(true)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Button size="sm" variant="outline" className="w-fit" onClick={() => void load()}>
          <RefreshCwIcon /> {t('common.tryAgain')}
        </Button>
        {!loaded && <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>}
        {loaded && hits.length === 0 && <p className="text-xs text-muted-foreground">{t('web.techStack.empty')}</p>}
        <ul className="flex flex-col gap-2">
          {hits.map((hit) => (
            <li key={`${hit.category}-${hit.name}`} className="rounded-lg border p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">{hit.name}</span>
                <Badge variant="secondary">{hit.category}</Badge>
              </div>
              <p className="mt-1 break-all text-muted-foreground">{hit.evidence}</p>
            </li>
          ))}
        </ul>
      </div>
    </ToolPage>
  )
}
