import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PageSvgItem } from '@/chrome/content/collectors/svgs'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { useDesignTool } from '../_shared'
import { sendToActiveTab } from '@/tools/web/tabMessaging'

export default function SvgGrabberTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.svg-grabber')
  const [items, setItems] = useState<PageSvgItem[]>([])
  const [jsx, setJsx] = useState('')

  const load = async () => {
    const data = await sendToActiveTab<PageSvgItem[]>({ type: 'GET_PAGE_SVGS' })
    setItems(data ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  const toJsx = async (markup: string) => {
    const data = await sendToActiveTab<string>({ type: 'SVG_TO_JSX', markup })
    setJsx(data ?? '')
  }

  return (
    <ToolPage tool={tool}>
      <Button size="sm" variant="outline" className="w-fit" onClick={() => void load()}>{t('common.tryAgain')}</Button>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border p-2 text-xs">
            <p className="truncate font-medium">{item.label}</p>
            <div className="mt-2 flex h-16 items-center justify-center overflow-hidden rounded bg-muted/40">
              {item.source === 'inline' ? (
                <div className="max-h-14 max-w-full [&_svg]:max-h-14" dangerouslySetInnerHTML={{ __html: item.markup }} />
              ) : (
                <span className="text-muted-foreground">{item.source}</span>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <CopyButton text={item.markup} label={t('design.svg.copySvg')} />
              <Button size="sm" variant="ghost" onClick={() => void toJsx(item.markup)}>{t('design.svg.copyJsx')}</Button>
            </div>
          </li>
        ))}
      </ul>
      {jsx && (
        <div className="mt-3">
          <CopyButton text={jsx} label={t('design.svg.jsxReady')} />
        </div>
      )}
    </ToolPage>
  )
}
