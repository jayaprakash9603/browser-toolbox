import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { generateDummyText, type DummyTextVariant, type LoremMode } from '@/core/engines/text'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions, useTransformTool } from '../_shared'

export default function DummyDataTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.dummy-data')
  const [mode, setMode] = useState<LoremMode>('paragraphs')
  const [variant, setVariant] = useState<DummyTextVariant>('lorem')
  const [countText, setCountText] = useState('3')
  const [output, setOutput] = useState('')

  const max = mode === 'words' ? 500 : 50
  const count = parseNumberInRange(countText, 1, max)

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Tabs value={mode} onValueChange={(value) => setMode(value as LoremMode)}>
            <TabsList>
              <TabsTrigger value="paragraphs">{t('text.paragraphs')}</TabsTrigger>
              <TabsTrigger value="sentences">{t('text.sentences')}</TabsTrigger>
              <TabsTrigger value="words">{t('text.words')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={variant} onValueChange={(value) => setVariant(value as DummyTextVariant)}>
            <TabsList>
              <TabsTrigger value="lorem">{t('text.variantLorem')}</TabsTrigger>
              <TabsTrigger value="random">{t('text.variantRandom')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t('text.count')}
            <NumberField
              value={countText}
              onChange={setCountText}
              min={1}
              max={max}
              placeholder={t('text.countRange', { max })}
              className="h-8 w-16"
              ariaLabel={t('text.count')}
            />
          </label>
          <Button
            size="sm"
            disabled={count === null}
            onClick={() => count !== null && setOutput(generateDummyText(mode, count, variant))}
          >
            {t('text.generate')}
          </Button>
        </div>

        <section className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span className="text-xs font-medium">{t('text.generatedText')}</span>
            {output ? <ToolActions value={output} onClear={() => setOutput('')} /> : null}
          </div>
          {output ? (
            <TextEditor
              value={output}
              readOnly
              fill
              mono={false}
              ariaLabel={t('text.generatedText')}
              className="min-h-0 flex-1"
            />
          ) : (
            <p className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
              {t('text.dummyEmpty')}
            </p>
          )}
        </section>
      </div>
    </ToolPage>
  )
}
