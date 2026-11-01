import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowRightIcon, SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@/app/navigation'
import { stashPayload } from '@/core/payloads'
import {
  detectFormat,
  type DetectedFormat,
} from '@/core/engines/formatDetect/detectFormat'
import { toolRegistry } from '@/core/registry'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
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

const FORMAT_SAMPLES: Record<DetectedFormat, string> = {
  json: '{\n  "name": "One Panel",\n  "tags": ["tools", "dev"],\n  "active": true\n}',
  xml: '<note>\n  <to>Team</to>\n  <body>Ship it</body>\n</note>',
  yaml: 'name: One Panel\ntags:\n  - tools\n  - dev',
  sql: 'SELECT id, name\nFROM users\nWHERE active = 1\nORDER BY name;',
  regex: '/^\\d{3}-\\d{4}$/',
  uuid: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
}

export default function FormatterStudioTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.formatter-studio')
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [override, setOverride] = useState<DetectedFormat | null>(null)
  const [sampleIndex, setSampleIndex] = useState(0)
  const deferred = useDeferredValue(text)
  const detection = useMemo(() => detectFormat(deferred), [deferred])
  const resolved = override ?? detection?.format ?? null
  const hasText = text.trim().length > 0
  const canOpen = hasText && resolved !== null

  const applyText = (next: string) => {
    setText(next)
    setOverride(null)
  }

  const sample = () => {
    const format = FORMATS[sampleIndex % FORMATS.length]
    setSampleIndex((index) => index + 1)
    applyText(FORMAT_SAMPLES[format])
  }

  const open = async () => {
    if (!resolved) return
    const target = FORMAT_TOOL[resolved]
    const destination = toolRegistry.get(target.toolId)
    if (!destination) return
    if (hasText) await stashPayload({ toolId: target.toolId, text })
    navigate(`${destination.route}${hasText ? (target.query ?? '') : ''}`)
  }

  const status =
    hasText && resolved
      ? {
          tone: 'valid' as const,
          text: override
            ? FORMAT_TOOL[override].label
            : t('formatterStudio.detectedShort', {
                defaultValue: '{{format}} detected',
                format: FORMAT_TOOL[resolved].label,
              }),
        }
      : null

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {hasText && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={t('formatterStudio.formats', { defaultValue: 'Format' })}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
            >
              {FORMATS.map((format) => {
                const active = resolved === format
                return (
                  <Button
                    key={format}
                    type="button"
                    size="sm"
                    variant={active ? 'secondary' : 'ghost'}
                    aria-pressed={active}
                    className={cn('h-8 px-2.5 text-xs', active && 'shadow-sm')}
                    onClick={() => setOverride(format)}
                  >
                    {FORMAT_TOOL[format].label}
                  </Button>
                )
              })}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!canOpen}
              className="shrink-0 gap-1.5"
              onClick={() => void open()}
            >
              {resolved
                ? t('formatterStudio.openIn', {
                    defaultValue: 'Open in {{format}}',
                    format: FORMAT_TOOL[resolved].label,
                  })
                : t('formatterStudio.pick', { defaultValue: 'Choose a format' })}
              <ArrowRightIcon aria-hidden className="size-3.5" />
            </Button>
          </div>
        )}

        <TextEditor
          value={text}
          onChange={applyText}
          fill
          mono
          language={resolved ?? undefined}
          ariaLabel={t('formatterStudio.input', { defaultValue: 'Paste or type content' })}
          label={t('formatterStudio.input', { defaultValue: 'Paste or type content' })}
          placeholder={t('formatterStudio.placeholder', {
            defaultValue: 'JSON, XML, YAML, SQL, a /regex/ or a UUID',
          })}
          status={status}
          actions={
            <Button type="button" size="sm" variant="ghost" onClick={sample}>
              <SparklesIcon aria-hidden />
              {t('formatterStudio.sample', { defaultValue: 'Sample' })}
            </Button>
          }
          onKeyCommand={() => void open()}
        />
      </div>
    </ToolPage>
  )
}
