import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { generateIds, isValidUuid, uuidVersion, type IdKind } from '@/core/engines/id'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions } from '@/tools/text/_shared'
import { useDevTool } from '../_shared'

const KINDS: { id: IdKind; label: string }[] = [
  { id: 'uuid-v4', label: 'UUID v4' },
  { id: 'uuid-v7', label: 'UUID v7' },
  { id: 'nanoid', label: 'NanoID' },
]

export default function IdToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.id-toolkit')
  const [kind, setKind] = useState<IdKind>('uuid-v4')
  const [count, setCount] = useState(1)
  const [output, setOutput] = useState<string[]>([])
  const [validateInput, setValidateInput] = useState('')

  const validation = validateInput.trim()
    ? { valid: isValidUuid(validateInput), version: uuidVersion(validateInput) }
    : null

  const generate = () => setOutput(generateIds(kind, count))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">{t('dev.tabGenerate')}</TabsTrigger>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-2">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {KINDS.map((k) => (
                  <Button key={k.id} size="sm" variant={kind === k.id ? 'secondary' : 'outline'} onClick={() => setKind(k.id)}>
                    {k.label}
                  </Button>
                ))}
                <Input
                  type="number" min={1} max={500} value={count}
                  onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setCount(Math.min(Math.max(1, v), 500)) }}
                  className="w-20" aria-label={t('text.count')}
                />
                <Button size="sm" onClick={generate}>
                  <RefreshCwIcon /> {t('text.generate')}
                </Button>
              </div>
              {output.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium">{t('text.output')} ({output.length})</span>
                    <ToolActions value={output.join('\n')} onClear={() => setOutput([])} />
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto">
                    {output.map((id) => (
                      <code key={id} className="block rounded border bg-muted/40 px-2 py-1 font-mono text-[11px]">{id}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="validate" className="mt-2">
            <div className="flex flex-col gap-2">
              <Input value={validateInput} onChange={(e) => setValidateInput(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" aria-label={t('dev.uuidValidate')} className="font-mono" />
              {validation && (
                validation.valid ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="border-green-500/40 text-green-700 dark:text-green-400">{t('dev.uuidValid')}</Badge>
                    {validation.version !== null && <Badge variant="outline">v{validation.version}</Badge>}
                  </div>
                ) : (
                  <Badge variant="outline" className="w-fit border-destructive/40 text-destructive">{t('dev.uuidInvalid')}</Badge>
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
