import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import { useTransformTool } from '../_shared'
import { CASE_STYLES, convertCase, type CaseStyle } from '@/core/engines/text'

export default function CaseConverterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.case-converter')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ style: CaseStyle; text: string } | null>(null)

  const convert = (style: CaseStyle) => setResult({ style, text: convertCase(input, style) })

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-3 gap-1.5 @[380px]:grid-cols-3">
          {CASE_STYLES.map((style) => (
            <Button
              key={style.id}
              variant={result?.style === style.id ? 'default' : 'outline'}
              size="xs"
              onClick={() => convert(style.id)}
              disabled={!input.trim()}
            >
              {t(`case.${style.id}`, { defaultValue: style.label })}
            </Button>
          ))}
        </div>
        <TextPaneGrid split={Boolean(result)}>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder="hello world example"
            ariaLabel={t('text.convertInput')}
            label={t('common.input')}
            fill
          />
          {result && (
            <TextEditor
              value={result.text}
              readOnly
              ariaLabel={t('text.converted')}
              label={t(`case.${result.style}`, {
                defaultValue: CASE_STYLES.find((style) => style.id === result.style)?.label,
              })}
              fill
            />
          )}
        </TextPaneGrid>
      </div>
    </ToolPage>
  )
}
