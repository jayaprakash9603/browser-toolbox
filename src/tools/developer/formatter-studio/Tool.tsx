import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowRightIcon } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@/app/navigation'
import { stashPayload } from '@/core/payloads'
import { detectFormat, type DetectedFormat } from '@/core/engines/formatDetect/detectFormat'
import { toolRegistry } from '@/core/registry'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

import { useDevTool } from '../_shared'

const FORMAT_TOOL: Record<DetectedFormat, { toolId: string; label: string; query?: string }> = {
  json: { toolId: 'developer.json-toolkit', label: 'JSON' },
  xml: { toolId: 'developer.xml-toolkit', label: 'XML' },
  yaml: { toolId: 'developer.yaml-toolkit', label: 'YAML' },
  sql: { toolId: 'developer.sql-toolkit', label: 'SQL' },
  regex: { toolId: 'developer.regex-toolkit', label: 'Regex' },
  uuid: { toolId: 'developer.id-toolkit', label: 'UUID', query: '?tab=validate' },
}

const FORMATS = Object.keys(FORMAT_TOOL) as DetectedFormat[]

export default function FormatterStudioTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.formatter-studio')
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [override, setOverride] = useState<DetectedFormat | null>(null)
  const deferred = useDeferredValue(text)
  const detection = useMemo(() => detectFormat(deferred), [deferred])
  const selected = override ?? detection?.format ?? null
  const hasText = text.trim().length > 0

  const open = async () => {
    if (!selected) return
    const target = FORMAT_TOOL[selected]
    const destination = toolRegistry.get(target.toolId)
    if (!destination) return
    if (hasText) await stashPayload({ toolId: target.toolId, text })
    navigate(`${destination.route}${hasText ? (target.query ?? '') : ''}`)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          {t('formatterStudio.input', { defaultValue: 'Paste or type content' })}
          <Textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setOverride(null)
            }}
            rows={8}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder={t('formatterStudio.placeholder', {
              defaultValue: 'JSON, XML, YAML, SQL, a /regex/ or a UUID',
            })}
          />
        </label>

        <p role="status" aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
          {describeDetection(t, hasText, detection, override)}
        </p>

        <div role="group" aria-label={t('formatterStudio.formats', { defaultValue: 'Format' })} className="flex flex-wrap gap-1.5">
          {FORMATS.map((format) => (
            <Button
              key={format}
              type="button"
              size="sm"
              variant={selected === format ? 'secondary' : 'outline'}
              aria-pressed={selected === format}
              className={cn('h-8', detection?.format === format && override === null && 'border-primary/50')}
              onClick={() => setOverride(format)}
            >
              {FORMAT_TOOL[format].label}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          className="w-fit"
          disabled={!selected}
          onClick={() => void open()}
        >
          {selected
            ? t('formatterStudio.openIn', {
                defaultValue: 'Open in {{format}}',
                format: FORMAT_TOOL[selected].label,
              })
            : t('formatterStudio.pick', { defaultValue: 'Choose a format' })}
          <ArrowRightIcon aria-hidden />
        </Button>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {t('formatterStudio.note', {
            defaultValue:
              'Nothing is changed until you open a tool. Your text is passed over as it is.',
          })}
        </p>
      </div>
    </ToolPage>
  )
}

function describeDetection(
  t: TFunction,
  hasText: boolean,
  detection: ReturnType<typeof detectFormat>,
  override: DetectedFormat | null,
): string {
  if (!hasText) return ''
  if (override) {
    return t('formatterStudio.chosen', {
      defaultValue: 'Using {{format}} (chosen by you).',
      format: FORMAT_TOOL[override].label,
    })
  }
  if (!detection) {
    return t('formatterStudio.none', { defaultValue: 'No format detected. Pick one below.' })
  }
  const format = FORMAT_TOOL[detection.format].label
  if (detection.format === 'json' && detection.validJson === false) {
    return t('formatterStudio.jsonInvalid', {
      defaultValue: 'Detected: JSON (it does not parse yet; the JSON tool will show the error).',
    })
  }
  return t('formatterStudio.detected', {
    defaultValue: 'Detected: {{format}} ({{confidence}} confidence).',
    format,
    confidence: detection.confidence,
  })
}
