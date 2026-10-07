import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CrosshairIcon } from 'lucide-react'

import type { SelectorSet } from '@/core/engines/selector'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { useQaTool } from '../_shared'

const SELECTOR_ROWS: { key: keyof SelectorSet; label: string }[] = [
  { key: 'cssId', label: 'CSS · ID' },
  { key: 'cssClass', label: 'CSS · Class' },
  { key: 'cssAttribute', label: 'CSS · Attribute' },
  { key: 'cssRelative', label: 'CSS · Relative' },
  { key: 'cssAbsolute', label: 'CSS · Absolute' },
  { key: 'xpathId', label: 'XPath · ID' },
  { key: 'xpathClass', label: 'XPath · Class' },
  { key: 'xpathAttribute', label: 'XPath · Attribute' },
  { key: 'xpathText', label: 'XPath · Text' },
  { key: 'xpathRelative', label: 'XPath · Relative' },
  { key: 'xpathAbsolute', label: 'XPath · Absolute' },
]

export default function SelectorGeneratorTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.selector-generator')
  const [selectors, setSelectors] = useState<SelectorSet | null>(null)

  const load = async (): Promise<SelectorSet | null> => {
    const area = chrome.storage?.session ?? chrome.storage?.local
    if (!area) return null
    const stored = (await area.get('toolbox.pickedElement')) as Record<
      string,
      { selectors: SelectorSet } | undefined
    >
    return stored['toolbox.pickedElement']?.selectors ?? null
  }

  useEffect(() => {
    let live = true
    void load().then((value) => {
      if (live && value) setSelectors(value)
    })
    const listener = (_: unknown, area: string) => {
      if (area === 'session' || area === 'local')
        void load().then((value) => {
          if (value) setSelectors(value)
        })
    }
    chrome.storage?.onChanged?.addListener(listener)
    return () => {
      live = false
      chrome.storage?.onChanged?.removeListener(listener)
    }
  }, [])

  const startPicker = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id != null) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PICK_ELEMENT_START' })
      } catch {
        /* not on this page */
      }
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Button size="sm" className="w-fit" onClick={() => void startPicker()}>
          <CrosshairIcon /> {t('qa.pickElement')}
        </Button>
        {!selectors ? (
          <p className="rounded-md border border-dashed py-10 text-center text-xs text-muted-foreground">
            {t('qa.noElementSelectors')}
          </p>
        ) : (
          <div className="space-y-1">
            {SELECTOR_ROWS.filter(({ key }) => selectors[key]).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 rounded-md border p-1.5">
                <span className="w-28 shrink-0 text-[10px] font-medium text-muted-foreground">
                  {label}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
                  {selectors[key]}
                </code>
                <CopyButton text={selectors[key] ?? ''} />
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
