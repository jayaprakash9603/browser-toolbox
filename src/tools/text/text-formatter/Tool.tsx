import { ToolPage } from '@/shared/components/ToolPage'
import { useTranslation } from 'react-i18next'
import { TextEditor } from '@/shared/components/TextEditor'
import { StatsBar, ToolActions, useInputOutput, useTransformTool } from '../_shared'

export default function TextFormatterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.formatter')
  const { input, setInput, output, setOutput } = useInputOutput()

  const run = (fn: (value: string) => string) => setOutput(fn(input))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('text.pasteOrType')}
            ariaLabel={t('text.input')}
            onKeyCommand={() => run((v) => v.trim())}
          />
          <StatsBar value={input} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <ActionButton onClick={() => run((v) => v.trim())}>{t('text.trim')}</ActionButton>
          <ActionButton onClick={() => run((v) => v.replace(/\s{2,}/g, ' '))}>
            {t('text.collapseSpaces')}
          </ActionButton>
          <ActionButton onClick={() => run((v) => v.replace(/\r\n?/g, '\n'))}>
            {t('text.normalizeBreaks')}
          </ActionButton>
          <ActionButton
            onClick={() => run((v) => v.split('\n').filter((l) => l.trim()).join('\n'))}
          >
            {t('text.removeBlankLines')}
          </ActionButton>
          <ActionButton onClick={() => run((v) => v.split('\n').map((l) => l.trim()).join('\n'))}>
            {t('text.trimEveryLine')}
          </ActionButton>
        </div>

        {output && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly ariaLabel={t('text.output')} />
          </div>
        )}

        <ToolActions value={input} onClear={() => { setInput(''); setOutput('') }} />
      </div>
    </ToolPage>
  )
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
    >
      {children}
    </button>
  )
}
