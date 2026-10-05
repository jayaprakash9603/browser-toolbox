import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { StatsBar, useTransformTool } from '../_shared'
import { CASE_STYLES, convertCase, type CaseStyle } from './logic'

export default function CaseConverterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.case-converter')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ style: CaseStyle; text: string } | null>(null)

  const convert = (style: CaseStyle) => setResult({ style, text: convertCase(input, style) })

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder="hello world example"
            ariaLabel={t('text.convertInput')}
            minRows={4}
          />
          <StatsBar value={input} />
        </div>
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
        {result && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">
                {t(`case.${result.style}`, { defaultValue: CASE_STYLES.find((style) => style.id === result.style)?.label })}
              </span>
              <CopyButton text={result.text} size="xs" />
            </div>
            <TextEditor value={result.text} readOnly ariaLabel={t('text.converted')} minRows={3} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
