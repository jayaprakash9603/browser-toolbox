import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyIcon, ExternalLinkIcon, LinkIcon, RefreshCwIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { useBrowserTool } from '../_shared'

export default function BrowserToolkitTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.toolkit')
  const [tab, setTab] = useState<{ url: string; title: string; id?: number } | null>(null)

  useEffect(() => {
    let live = true
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      if (live && active)
        setTab({ url: active.url ?? '', title: active.title ?? '', id: active.id })
    })
    return () => {
      live = false
    }
  }, [])

  const actions: { icon: React.ReactNode; label: string; run: () => void | Promise<void> }[] = [
    {
      icon: <LinkIcon />,
      label: t('browser.copyUrl'),
      run: () => {
        if (tab) void navigator.clipboard.writeText(tab.url)
      },
    },
    {
      icon: <CopyIcon />,
      label: t('browser.copyTitle'),
      run: () => {
        if (tab) void navigator.clipboard.writeText(tab.title)
      },
    },
    {
      icon: <CopyIcon />,
      label: t('browser.copyTitleUrl'),
      run: () => {
        if (tab) void navigator.clipboard.writeText(`${tab.title}\n${tab.url}`)
      },
    },
    {
      icon: <RefreshCwIcon />,
      label: t('browser.reload'),
      run: async () => {
        if (tab?.id != null) await chrome.tabs.reload(tab.id)
      },
    },
    {
      icon: <RefreshCwIcon />,
      label: t('browser.hardReload'),
      run: async () => {
        if (tab?.id != null) await chrome.tabs.reload(tab.id, { bypassCache: true })
      },
    },
    {
      icon: <ExternalLinkIcon />,
      label: t('browser.duplicate'),
      run: async () => {
        if (tab?.id != null) await chrome.tabs.duplicate(tab.id)
      },
    },
  ]

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        {tab && (
          <div className="rounded-md border bg-muted/40 p-2">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{tab.title || '—'}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{tab.url}</p>
              </div>
              <CopyButton text={`${tab.title}\n${tab.url}`} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="justify-start gap-1.5 text-[11px]"
              onClick={() => void action.run()}
              disabled={!tab}
            >
              {action.icon} {action.label}
            </Button>
          ))}
        </div>
      </div>
    </ToolPage>
  )
}
