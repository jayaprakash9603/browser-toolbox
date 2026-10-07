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
      <button
        type="button"
        onClick={() => void analyze()}
        className="mb-4 flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <ClipboardPasteIcon className="size-3.5 shrink-0" />
        {t('smartPaste.cta', { defaultValue: 'Analyze clipboard content…' })}
      </button>
    )
  }

  return (
    <div className="mb-4 rounded-md border bg-accent/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <SparklesIcon className="size-3.5 text-primary" />
          {t('smartPaste.title', { defaultValue: 'Clipboard insights' })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDismissed(true)}
          aria-label={t('dialogs.close')}
        >
          <XIcon className="size-3" />
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
