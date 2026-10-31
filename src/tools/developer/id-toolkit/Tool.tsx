import { useState } from 'react'

import { useDeepLinkParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { usePayloadText } from '@/shared/hooks/usePayloadText'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { generateIds, isValidUuid, uuidVersion, type IdKind } from '@/core/engines/id'
import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
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
  const [tab, setTab] = useDeepLinkTab('tab', ['generate', 'validate'] as const, 'generate')
  const [kind, setKind] = useDeepLinkParam('kind', ['uuid-v4', 'uuid-v7', 'nanoid'] as const, 'uuid-v4')
  const [countText, setCountText] = useState('1')
  const count = parseNumberInRange(countText, 1, 500)
  const [output, setOutput] = useState<string[]>([])
  const [validateInput, setValidateInput] = useState('')
  usePayloadText(tool.id, setValidateInput)

  const validation = validateInput.trim()
    ? { valid: isValidUuid(validateInput), version: uuidVersion(validateInput) }
    : null

  const generate = () => {
    if (count === null) return
    setOutput(generateIds(kind, count))
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="generate">{t('dev.tabGenerate')}</TabsTrigger>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-2 gap-3">
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {KINDS.map((k) => (
                  <Button
                    key={k.id}
                    size="sm"
                    variant={kind === k.id ? 'secondary' : 'outline'}
                    data-search-id={k.id}
                    onClick={() => setKind(k.id)}
                  >
                    {k.label}
                  </Button>
                ))}
                <NumberField
                  value={countText}
                  onChange={setCountText}
                  min={1}
                  max={500}
                  className="w-20"
                  ariaLabel={t('text.count')}
                />
                <Button size="sm" onClick={generate} disabled={count === null}>
                  <RefreshCwIcon /> {t('text.generate')}
                </Button>
              </div>
              {output.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-1 flex shrink-0 items-center justify-between">
                    <span className="text-xs font-medium">
                      {t('text.output')} ({output.length})
                    </span>
                    <ToolActions value={output.join('\n')} onClear={() => setOutput([])} />
                  </div>
                  <div className="scrollbar-styled min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {output.map((id) => (
                      <code
                        key={id}
                        className="block rounded border bg-muted/40 px-2 py-1 font-mono text-[11px]"
                      >
                        {id}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="validate" className="mt-2">
            <div className="flex flex-col gap-2">
              <Input
                value={validateInput}
                onChange={(e) => setValidateInput(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                aria-label={t('dev.uuidValidate')}
                className="font-mono"
              />
              {validation &&
                (validation.valid ? (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="border-green-500/40 text-green-700 dark:text-green-400"
                    >
                      {t('dev.uuidValid')}
                    </Badge>
                    {validation.version !== null && (
                      <Badge variant="outline">v{validation.version}</Badge>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="w-fit border-destructive/40 text-destructive">
                    {t('dev.uuidInvalid')}
                  </Badge>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
