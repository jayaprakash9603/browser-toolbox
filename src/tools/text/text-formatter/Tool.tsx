import { useMemo, useState } from 'react'
import { Minimize2Icon, SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { toUserMessage } from '@/core/errors'
import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'
import { ErrorState } from '@/shared/components/ErrorState'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'
import { OutputPane } from '@/tools/developer/_shared'
import { useTransformTool } from '../_shared'
import { FormatLanguageSelect } from './FormatLanguageSelect'
import {
  detectTextFormat,
  formatText,
  minifyText,
} from './logic'
import { TEXT_FORMAT_IDS, type TextFormatId, type TextFormatSelection } from './formatters/types'

const EXAMPLES: Partial<Record<TextFormatId, string>> = {
  javascript: `function calculateTotal(items, discountRate = 0.1) {
const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
if (subtotal <= 0) return { total: 0, savings: 0 };
const discount = subtotal * discountRate;
return { subtotal, discount, total: subtotal - discount };
}`,
  typescript: `interface UserProfile { id: string; name: string; email: string; role: 'admin' | 'user'; }
function formatWelcome(user: UserProfile): string {
const title = user.role === 'admin' ? 'Administrator' : 'Member';
return \`Welcome, \${user.name} (\${title}) <\${user.email}>\`;
}`,
  html: `<div class="card" id="user-profile"><header class="card-header"><h2>Profile</h2><span class="badge">Active</span></header><div class="card-body"><p>User details and settings.</p><button type="button" class="btn btn-primary">Edit</button></div></div>`,
  css: `.container{display:flex;flex-direction:column;gap:1rem;padding:1.5rem;}.card{background-color:#ffffff;border-radius:0.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.1);}`,
  json: `{"name":"One Panel","version":"1.0.0","active":true,"features":["formatter","toolkit","converter"],"settings":{"theme":"system","autoDetect":true}}`,
  xml: `<root><item id="1"><name>First</name><status>active</status></item><item id="2"><name>Second</name><status>pending</status></item></root>`,
  markdown: `# One Panel
A fast and offline-ready toolbox extension for modern browsers.
- Fast performance
- Clean UI/UX
- Offline support`,
}

function toEditorLanguage(format: TextFormatId): EditorLanguage {
  switch (format) {
    case 'javascript':
    case 'typescript':
      return 'javascript'
    case 'json':
      return 'json'
    case 'html':
      return 'html'
    case 'xml':
      return 'xml'
    case 'css':
      return 'css'
    default:
      return 'text'
  }
}

export default function TextFormatterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.formatter')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<'format' | 'minify'>('format')
  const [formatSelection, setFormatSelection] = useDeepLinkParam(
    'format',
    TEXT_FORMAT_IDS,
    'auto' as TextFormatSelection,
  )

  const detectedFormat = useMemo(() => detectTextFormat(input), [input])
  const activeFormat = formatSelection === 'auto' ? detectedFormat : formatSelection
  const editorLanguage = useMemo(() => toEditorLanguage(activeFormat), [activeFormat])

  const run = (action: 'format' | 'minify') => {
    setLastAction(action)
    try {
      setOutput(
        action === 'format' ? formatText(input, activeFormat) : minifyText(input, activeFormat),
      )
      setError(null)
    } catch (cause) {
      setOutput('')
      setError(toUserMessage(cause, t('errors.formatContent')))
    }
  }

  const handleFormatChange = (value: TextFormatSelection) => {
    setFormatSelection(value)
    if (output && input.trim()) {
      const target = value === 'auto' ? detectTextFormat(input) : value
      try {
        setOutput(lastAction === 'minify' ? minifyText(input, target) : formatText(input, target))
        setError(null)
      } catch (cause) {
        setError(toUserMessage(cause, t('errors.formatContent')))
      }
    }
  }

  const handleTryExample = () => {
    const sample = EXAMPLES[activeFormat] ?? EXAMPLES.javascript!
    setInput(sample)
    setError(null)
    setLastAction('format')
    try {
      setOutput(formatText(sample, activeFormat === 'plain-text' ? 'javascript' : activeFormat))
    } catch {
      // ignore
    }
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              onClick={() => run('format')}
              disabled={!input.trim()}
              className="gap-1.5"
            >
              <SparklesIcon className="size-3.5" />
              {t('text.beautify')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => run('minify')}
              disabled={!input.trim()}
              className="gap-1.5"
            >
              <Minimize2Icon className="size-3.5" />
              {t('text.minify')}
            </Button>
            <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
            <FormatLanguageSelect
              value={formatSelection}
              detectedFormat={detectedFormat}
              onValueChange={handleFormatChange}
            />
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleTryExample}
          >
            <SparklesIcon className="size-3.5" />
            {t('dev.tryExample')}
          </Button>
        </div>

        <TextPaneGrid split={Boolean(output && !error)}>
          <TextEditor
            value={input}
            onChange={(value) => {
              setInput(value)
              if (!value) {
                setOutput('')
                setError(null)
              }
            }}
            placeholder={t('text.pasteOrType')}
            ariaLabel={t('text.input')}
            label={t('common.input')}
            language={editorLanguage}
            onKeyCommand={() => run('format')}
            fill
          />
          {output && !error && (
            <OutputPane
              value={output}
              error={null}
              language={editorLanguage}
              label={lastAction === 'minify' ? t('text.minify') : t('text.beautify')}
              onClear={() => setOutput('')}
              fill
            />
          )}
        </TextPaneGrid>
        {error && <ErrorState message={error} />}
      </div>
    </ToolPage>
  )
}
