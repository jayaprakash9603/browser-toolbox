import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon } from 'lucide-react'

import {
  HASH_ALGORITHMS,
  hash,
  hmac,
  type HashAlgorithm,
  type HmacAlgorithm,
} from '@/core/engines/hash'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { useSecurityTool } from '../_shared'

export default function HashToolkitTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.hash-toolkit')
  const [tab, setTab] = useState<'hash' | 'hmac'>('hash')
  const [input, setInput] = useState('')
  const [secret, setSecret] = useState('')
  const [results, setResults] = useState<Record<string, string>>({})

  useEffect(() => {
    let live = true
    if (!input) {
      Promise.resolve().then(() => {
        if (live) setResults({})
      })
      return () => {
        live = false
      }
    }
    const algorithms: (HashAlgorithm | HmacAlgorithm)[] =
      tab === 'hmac' ? ['SHA-256', 'SHA-384', 'SHA-512'] : HASH_ALGORITHMS.map((a) => a.id)
    void Promise.all(
      algorithms.map(async (algorithm) => {
        const result =
          tab === 'hmac'
            ? await hmac(algorithm as HmacAlgorithm, input, secret)
            : await hash(algorithm as HashAlgorithm, input)
        return [algorithm, result.ok ? result.value : result.error] as const
      }),
    ).then((entries) => {
      if (live) setResults(Object.fromEntries(entries))
    })
    return () => {
      live = false
    }
  }, [input, secret, tab])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="hash">{t('security.tabHash')}</TabsTrigger>
            <TabsTrigger value="hmac">HMAC</TabsTrigger>
          </TabsList>
        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('security.hashInput')}
          ariaLabel={t('security.hashInput')}
          minRows={4}
        />
        <TabsContent value="hmac" className="mt-0">
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={t('security.secret')}
            aria-label={t('security.secret')}
            className="font-mono"
          />
        </TabsContent>
        </Tabs>
        {input && (
          <div className="space-y-1.5">
            {Object.entries(results).map(([algorithm, value]) => {
              const meta = HASH_ALGORITHMS.find((a) => a.id === algorithm)
              return (
                <div key={algorithm} className="rounded border bg-muted/40 p-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {algorithm}
                      </Badge>
                      {meta?.legacy && (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400">
                          <AlertTriangleIcon className="size-2.5" /> {t('security.legacy')}
                        </span>
                      )}
                    </div>
                    <CopyButton text={value} />
                  </div>
                  <code className="mt-0.5 block break-all font-mono text-[10px]">{value}</code>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
