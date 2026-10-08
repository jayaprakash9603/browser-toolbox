import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardPasteIcon, SparklesIcon, XIcon } from 'lucide-react'

import { useRouter } from '@/app/router'
import { readClipboardText } from '@/core/clipboard'
import { detectContent, type Detection } from '@/core/engines/detection'
import { toolRegistry } from '@/core/registry'
import { getToolName } from '@/i18n/toolLabels'
import { Button } from '@/shared/components/ui/button'

const DETECTION_ROUTES: Record<Detection['kind'], string | null> = {
  json: 'developer.json-toolkit',
  jwt: 'security.jwt-toolkit',
  url: 'web.url-toolkit',
  color: 'design.color-converter',
  timestamp: 'datetime.toolkit',
  xml: 'developer.xml-toolkit',
  yaml: 'developer.yaml-toolkit',
  base64: 'security.encoder-decoder',
}

export function SmartSuggestions() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [detections, setDetections] = useState<{ detection: Detection; text: string }[]>([])
  const [dismissed, setDismissed] = useState(false)

  const available = useMemo(
    () =>
      detections.filter(({ detection }) => {
        const toolId = DETECTION_ROUTES[detection.kind]
        return toolId ? Boolean(toolRegistry.get(toolId)) : false
      }),
    [detections],
  )

  const analyze = async () => {
    const text = await readClipboardText()
    if (!text) return
    const found = detectContent(text).map((detection) => ({ detection, text }))
    setDetections(found)
    setDismissed(false)
  }

  if (available.length === 0 || dismissed) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-dashed border-foreground/15 bg-card/60 px-3 py-2.5 transition-colors duration-150 hover:border-primary/40 hover:bg-card">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ClipboardPasteIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">
            {t('smartPaste.calloutTitle')}
          </p>
          <p className="truncate text-xs text-muted-foreground">{t('smartPaste.hint')}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void analyze()}>
          <SparklesIcon /> {t('smartPaste.cta')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          <SparklesIcon className="size-4 text-primary" aria-hidden />
          {t('smartPaste.title', { defaultValue: 'Clipboard insights' })}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setDismissed(true)}
          aria-label={t('dialogs.close')}
        >
          <XIcon />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {available.map(({ detection, text }) => {
          const toolId = DETECTION_ROUTES[detection.kind]
          const tool = toolId ? toolRegistry.get(toolId) : null
          if (!tool) return null
          return (
            <Button
              key={detection.kind}
              size="xs"
              variant="secondary"
              onClick={() => {
                void import('@/core/payloads').then(({ stashPayload }) =>
                  stashPayload({ toolId: tool.id, text }),
                )
                navigate(tool.route)
              }}
            >
              {t(`smartPaste.${detection.kind}`, { defaultValue: detection.label })} →{' '}
              {getToolName(tool, t)}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
