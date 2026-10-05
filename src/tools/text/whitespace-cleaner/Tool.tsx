import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import {
  cleanWhitespace,
  DEFAULT_WHITESPACE_OPTIONS,
  type WhitespaceOptions,
} from './logic'

const OPTION_LABELS: { key: keyof WhitespaceOptions; labelKey: string }[] = [
  { key: 'trimLines', labelKey: 'text.trimEveryLine' },
  { key: 'collapseSpaces', labelKey: 'text.collapseMultipleSpaces' },
  { key: 'normalizeLineBreaks', labelKey: 'text.normalizeLineBreaks' },
  { key: 'removeBlankLines', labelKey: 'text.removeBlankLines' },
]

export default function WhitespaceCleanerTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.whitespace-cleaner')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [options, setOptions] = useState<WhitespaceOptions>(DEFAULT_WHITESPACE_OPTIONS)

  const clean = () => setOutput(cleanWhitespace(input, options))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('text.pasteMessyWhitespace')}
            ariaLabel={t('text.input')}
            onKeyCommand={clean}
          />
          <StatsBar value={input} />
        </div>

        <div className="grid grid-cols-1 gap-2 @[380px]:grid-cols-2">
          {OPTION_LABELS.map(({ key, labelKey }) => (
            <label key={key} className="flex items-center justify-between gap-2 text-xs">
              {t(labelKey)}
              <Switch
                checked={options[key]}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, [key]: checked }))
                }
                aria-label={t(labelKey)}
              />
            </label>
          ))}
        </div>

        <Button size="sm" onClick={clean} disabled={!input}>
          {t('text.clean')}
        </Button>

        {output !== '' && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly ariaLabel={t('text.cleaned')} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
