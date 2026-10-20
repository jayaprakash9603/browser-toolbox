import { useState } from 'react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useTranslation } from 'react-i18next'
import { DicesIcon } from 'lucide-react'

import { randomHex, randomInt, randomString } from '@/core/engines/password'
import { generateNanoId, generateUuidV4 } from '@/core/engines/id'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { ToolActions } from '@/tools/text/_shared'
import { useSecurityTool } from '../_shared'

type RandomKind = 'number' | 'string' | 'hex' | 'uuid' | 'nanoid'

export default function RandomGeneratorTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.random-generator')
  const [kind, setKind] = useDeepLinkTab(
    'tab',
    ['number', 'string', 'hex', 'uuid', 'nanoid'] as const,
    'string',
  )
  const [minText, setMinText] = useState('1')
  const [maxText, setMaxText] = useState('100')
  const [lengthText, setLengthText] = useState('16')
  const min = parseNumberInRange(minText, undefined, undefined)
  const max = parseNumberInRange(maxText)
  const length = parseNumberInRange(lengthText, 1, 512)
  const [output, setOutput] = useState('')

  const generate = () => {
    switch (kind) {
      case 'number':
        if (min === null || max === null) return
        setOutput(String(randomInt(min, max)))
        break
      case 'string':
        if (length === null) return
        setOutput(randomString(length))
        break
      case 'hex':
        if (length === null) return
        setOutput(randomHex(Math.ceil(length / 2)))
        break
      case 'uuid':
        setOutput(generateUuidV4())
        break
      case 'nanoid':
        if (length === null) return
        setOutput(generateNanoId(length))
        break
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as RandomKind)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="number">{t('security.rndNumber')}</TabsTrigger>
            <TabsTrigger value="string">{t('security.rndString')}</TabsTrigger>
            <TabsTrigger value="hex">{t('security.rndHex')}</TabsTrigger>
            <TabsTrigger value="uuid">UUID</TabsTrigger>
            <TabsTrigger value="nanoid">NanoID</TabsTrigger>
          </TabsList>
        </Tabs>
        {kind === 'number' && (
          <div className="flex items-center gap-2">
            <NumberField
              value={minText}
              onChange={setMinText}
              allowNegative
              className="w-24"
              ariaLabel="min"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <NumberField
              value={maxText}
              onChange={setMaxText}
              allowNegative
              className="w-24"
              ariaLabel="max"
            />
          </div>
        )}
        {(kind === 'string' || kind === 'hex' || kind === 'nanoid') && (
          <label className="flex items-center gap-2 text-xs">
            {t('security.length')}
            <NumberField
              value={lengthText}
              onChange={setLengthText}
              min={1}
              max={512}
              className="w-20"
              ariaLabel={t('security.length')}
            />
          </label>
        )}
        <Button
          size="sm"
          className="w-fit"
          onClick={generate}
          disabled={
            (kind === 'number' && (min === null || max === null)) ||
            ((kind === 'string' || kind === 'hex' || kind === 'nanoid') && length === null)
          }
        >
          <DicesIcon /> {t('text.generate')}
        </Button>
        {output && (
          <div className="flex items-center justify-between gap-1 rounded border bg-muted/40 px-2 py-1.5">
            <code className="min-w-0 flex-1 break-all font-mono text-[12px]">{output}</code>
            <div className="flex gap-1">
              <CopyButton text={output} />
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
