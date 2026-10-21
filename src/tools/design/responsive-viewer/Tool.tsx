import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { ToolPage } from '@/shared/components/ToolPage'
import { useDesignTool } from '../_shared'

const DEVICES = [
  { id: 'iphone', label: 'iPhone 15', width: 393, height: 852 },
  { id: 'ipad', label: 'iPad Pro', width: 1024, height: 1366 },
  { id: 'laptop', label: 'Laptop 13"', width: 1280, height: 800 },
  { id: 'desktop', label: 'Desktop', width: 1920, height: 1080 },
] as const

export default function ResponsiveViewerTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.responsive-viewer')
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<string[]>(['iphone', 'laptop'])

  useEffect(() => {
    void getActiveBrowserTab().then((tab) => {
      if (tab?.url && !tab.url.startsWith('chrome')) setUrl(tab.url)
    })
  }, [])

  return (
    <ToolPage tool={tool}>
      <input
        className="w-full rounded-md border px-2 py-1.5 text-xs"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t('design.responsive.url')}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`rounded-md border px-2 py-1 text-xs ${selected.includes(d.id) ? 'bg-secondary' : ''}`}
            onClick={() =>
              setSelected((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))
            }
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {DEVICES.filter((d) => selected.includes(d.id)).map((d) => (
          <div key={d.id} className="rounded-lg border p-2">
            <p className="mb-1 text-[11px] font-medium">{d.label}</p>
            <iframe
              title={d.label}
              src={url}
              className="w-full rounded border bg-white"
              style={{ height: Math.min(360, d.height * 0.35), maxWidth: '100%' }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        ))}
      </div>
    </ToolPage>
  )
}
