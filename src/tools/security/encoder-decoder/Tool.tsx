import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownUpIcon } from 'lucide-react'

import { decode, encode, type EncodingKind } from '@/core/engines/encoding'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView } from '@/tools/developer/_shared'
import { ToolActions } from '@/tools/text/_shared'
import { useSecurityTool } from '../_shared'

const KINDS: { id: EncodingKind; label: string }[] = [
  { id: 'base64', label: 'Base64' },
  { id: 'url', label: 'URL' },
  { id: 'html', label: 'HTML' },
  { id: 'unicode', label: 'Unicode' },
  { id: 'hex', label: 'Hex' },
]

export default function EncoderDecoderTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.encoder-decoder')
  const [kind, setKind] = useState<EncodingKind>('base64')
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    if (!input) return null
    return direction === 'encode' ? encode(kind, input) : decode(kind, input)
  }, [input, kind, direction])

  const output = result?.ok ? result.value : ''

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as EncodingKind)}>
          <TabsList className="flex-wrap">
            {KINDS.map((k) => (
              <TabsTrigger key={k.id} value={k.id}>
                {k.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={direction === 'encode' ? 'secondary' : 'outline'}
            onClick={() => setDirection('encode')}
          >
            {t('security.encode')}
          </Button>
          <Button
            size="sm"
            variant={direction === 'decode' ? 'secondary' : 'outline'}
            onClick={() => setDirection('decode')}
          >
            {t('security.decode')}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              if (output) {
                setInput(output)
                setDirection(direction === 'encode' ? 'decode' : 'encode')
              }
            }}
            disabled={!output}
            aria-label={t('security.swap')}
            title={t('security.swap')}
          >
            <ArrowDownUpIcon />
          </Button>
        </div>
        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('security.inputPlaceholder')}
          ariaLabel={t('security.input')}
          minRows={5}
        />
        {result && !result.ok && <JsonErrorView message={result.error} />}
        {output && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-1 flex shrink-0 items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output} onClear={() => setInput('')} />
            </div>
            <pre className="scrollbar-both min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
