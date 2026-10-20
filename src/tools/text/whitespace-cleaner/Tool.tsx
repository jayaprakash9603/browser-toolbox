import { useState } from 'react'

import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { OutputPane } from '@/tools/developer/_shared'
import { useTransformTool } from '../_shared'
import {
  cleanWhitespace,
  DEFAULT_WHITESPACE_OPTIONS,
  type WhitespaceOptions,
} from '@/core/engines/text'

const OPTION_LABELS: { key: keyof WhitespaceOptions; labelKey: string; searchId: string }[] = [
  { key: 'trimLines', labelKey: 'text.trimEveryLine', searchId: 'trimEveryLine' },
  { key: 'collapseSpaces', labelKey: 'text.collapseMultipleSpaces', searchId: 'collapseMultipleSpaces' },
  { key: 'normalizeLineBreaks', labelKey: 'text.normalizeLineBreaks', searchId: 'normalizeLineBreaks' },
  { key: 'removeBlankLines', labelKey: 'text.removeBlankLines', searchId: 'removeBlankLines' },
]

export default function WhitespaceCleanerTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.whitespace-cleaner')
  useFocusTarget()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [options, setOptions] = useState<WhitespaceOptions>(DEFAULT_WHITESPACE_OPTIONS)

  const clean = () => setOutput(cleanWhitespace(input, options))

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 @[380px]:grid-cols-2">
          {OPTION_LABELS.map(({ key, labelKey, searchId }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-2 text-xs"
              data-search-id={searchId}
            >
              {t(labelKey)}
              <Switch
                checked={options[key]}
                onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, [key]: checked }))}
                aria-label={t(labelKey)}
              />
            </label>
          ))}
        </div>

        <Button size="sm" onClick={clean} disabled={!input}>
          {t('text.clean')}
        </Button>

        <TextPaneGrid split={output !== ''}>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('text.pasteMessyWhitespace')}
            ariaLabel={t('text.input')}
            label={t('common.input')}
            onKeyCommand={clean}
            fill
          />
          {output !== '' && (
            <OutputPane value={output} error={null} label={t('text.cleaned')} onClear={() => setOutput('')} fill />
          )}
        </TextPaneGrid>
      </div>
    </ToolPage>
  )
}
