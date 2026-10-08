import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CrosshairIcon, MousePointerClickIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { useQaTool } from '../_shared'

interface PickedElement {
  element: {
    tag: string
    id: string
    classes: string[]
    attributes: Record<string, string>
    text: string
    html: string
    dimensions: { width: number; height: number; x: number; y: number }
    computedStyles: Record<string, string>
  }
  selectors: Record<string, string | null>
}

export default function ElementInspectorTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.element-inspector')
  const [picked, setPicked] = useState<PickedElement | null>(null)
  const [picking, setPicking] = useState(false)

  const load = async () => {
    const area = chrome.storage?.session ?? chrome.storage?.local
    if (!area) return null
    const stored = (await area.get('toolbox.pickedElement')) as Record<
      string,
      PickedElement | undefined
    >
    return stored['toolbox.pickedElement'] ?? null
  }

  useEffect(() => {
    let live = true
    void load().then((value) => {
      if (live && value) setPicked(value)
    })
    const listener = (_: unknown, area: string) => {
      if (area === 'session' || area === 'local')
        void load().then((value) => {
          if (value) setPicked(value)
        })
    }
    chrome.storage?.onChanged?.addListener(listener)
    return () => {
      live = false
      chrome.storage?.onChanged?.removeListener(listener)
    }
  }, [])

  const startPicker = async () => {
    setPicking(true)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id != null) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PICK_ELEMENT_START' })
      } catch {
        /* content script not on this page yet */
      }
    }
    setPicking(false)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Button size="sm" className="w-fit" onClick={() => void startPicker()} disabled={picking}>
          <CrosshairIcon /> {t('qa.pickElement')}
        </Button>
        {!picked && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center text-muted-foreground">
            <MousePointerClickIcon className="size-8" />
            <p className="text-xs">{t('qa.noElement')}</p>
          </div>
        )}
        {picked && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary">{`<${picked.element.tag}>`}</Badge>
              {picked.element.id && <Badge variant="outline">#{picked.element.id}</Badge>}
              {picked.element.classes.map((cls) => (
                <Badge key={cls} variant="outline">
                  .{cls}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <Stat label="W" value={Math.round(picked.element.dimensions.width)} />
              <Stat label="H" value={Math.round(picked.element.dimensions.height)} />
              <Stat label="X" value={Math.round(picked.element.dimensions.x)} />
              <Stat label="Y" value={Math.round(picked.element.dimensions.y)} />
            </div>
            {picked.element.text.trim() && (
              <Section title={t('qa.text')} copy={picked.element.text.trim()}>
                <p className="text-xs">{picked.element.text.trim().slice(0, 200)}</p>
              </Section>
            )}
            <Section
              title={t('qa.attributes')}
              copy={JSON.stringify(picked.element.attributes, null, 2)}
            >
              <div className="space-y-0.5 font-mono text-[11px]">
                {Object.entries(picked.element.attributes).map(([name, value]) => (
                  <div key={name}>
                    <span className="text-primary">{name}</span>=
                    <span className="text-muted-foreground">"{value}"</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title={t('qa.selectors')} copy={picked.selectors.cssRelative ?? ''}>
              <div className="space-y-1">
                {Object.entries(picked.selectors)
                  .filter(([, v]) => v)
                  .map(([kind, value]) => (
                    <div key={kind} className="flex items-center justify-between gap-1">
                      <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{value}</code>
                      <CopyButton text={value ?? ''} />
                    </div>
                  ))}
              </div>
            </Section>
            <Section
              title={t('qa.computedStyles')}
              copy={JSON.stringify(picked.element.computedStyles, null, 2)}
            >
              <div className="space-y-0.5 font-mono text-[11px]">
                {Object.entries(picked.element.computedStyles).map(([prop, value]) => (
                  <div key={prop}>
                    <span className="text-primary">{prop}:</span>{' '}
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </ToolPage>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-1.5">
      <p className="text-xs font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function Section({
  title,
  copy,
  children,
}: {
  title: string
  copy: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium">{title}</span>
        <CopyButton text={copy} />
      </div>
      {children}
    </div>
  )
}
