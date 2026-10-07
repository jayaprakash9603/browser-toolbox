import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DicesIcon } from 'lucide-react'

import { randomHex, randomInt, randomString } from '@/core/engines/password'
import { generateNanoId, generateUuidV4 } from '@/core/engines/id'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { ToolActions } from '@/tools/text/_shared'
import { useSecurityTool } from '../_shared'

type RandomKind = 'number' | 'string' | 'hex' | 'uuid' | 'nanoid'

export default function RandomGeneratorTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.random-generator')
  const [kind, setKind] = useState<RandomKind>('string')
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(100)
  const [length, setLength] = useState(16)
  const [output, setOutput] = useState('')

  const generate = () => {
    switch (kind) {
      case 'number':
        setOutput(String(randomInt(min, max)))
        break
      case 'string':
        setOutput(randomString(length))
        break
      case 'hex':
        setOutput(randomHex(Math.ceil(length / 2)))
        break
      case 'uuid':
        setOutput(generateUuidV4())
        break
      case 'nanoid':
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
            <Input
              type="number"
              value={min}
              onChange={(e) => setMin(Number(e.target.value) || 0)}
              className="w-24"
              aria-label="min"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value) || 0)}
              className="w-24"
              aria-label="max"
            />
          </div>
        )}
        {(kind === 'string' || kind === 'hex' || kind === 'nanoid') && (
          <label className="flex items-center gap-2 text-xs">
            {t('security.length')}
            <Input
              type="number"
              min={1}
              max={512}
              value={length}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v)) setLength(Math.min(Math.max(1, v), 512))
              }}
              className="w-20"
              aria-label={t('security.length')}
            />
          </label>
        )}
        <Button size="sm" className="w-fit" onClick={generate}>
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
