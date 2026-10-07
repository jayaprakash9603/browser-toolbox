import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { generateDummyText, type DummyTextVariant, type LoremMode } from '@/core/engines/text'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions, useTransformTool } from '../_shared'

export default function DummyDataTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.dummy-data')
  const [mode, setMode] = useState<LoremMode>('paragraphs')
  const [variant, setVariant] = useState<DummyTextVariant>('lorem')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')

  const max = mode === 'words' ? 500 : 50

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <Input
            type="number"
            min={1}
            max={max}
            value={count}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value)) setCount(Math.min(Math.max(1, value), max))
            }}
            className="w-20"
            aria-label={t('text.count')}
          />
          <Button size="sm" onClick={() => setOutput(generateDummyText(mode, count, variant))}>
            {t('text.generate')}
          </Button>
        </div>

        {output && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('text.generatedText')}</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor
              value={output}
              readOnly
              mono={false}
              ariaLabel={t('text.generatedText')}
              minRows={10}
            />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
