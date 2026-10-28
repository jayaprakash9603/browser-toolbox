import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { hmac, type HmacAlgorithm } from '@/core/engines/hash'
import { TextEditor } from '@/shared/components/TextEditor'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'

export function HmacPanel() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [secret, setSecret] = useState('')
  const [results, setResults] = useState<Record<string, string>>({})

  useEffect(() => {
    let live = true
    if (!input || !secret) {
      setResults({})
      return () => {
        live = false
      }
    }
    const algorithms: HmacAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512']
    void Promise.all(
      algorithms.map(async (algorithm) => {
        const result = await hmac(algorithm, input, secret)
        return [algorithm, result.ok ? result.value : result.error] as const
      }),
    ).then((entries) => {
      if (live) setResults(Object.fromEntries(entries))
    })
    return () => {
      live = false
    }
  }, [input, secret])

  return (
    <div className="flex flex-col gap-3">
      <TextEditor
        value={input}
        onChange={setInput}
        placeholder={t('security.hashInput')}
        ariaLabel={t('security.hashInput')}
        minRows={3}
      />
      <Input
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder={t('security.secret')}
        aria-label={t('security.secret')}
        className="font-mono"
        type="password"
        autoComplete="off"
      />
      {input && secret && (
        <ul className="space-y-1.5">
          {Object.entries(results).map(([algorithm, value]) => (
            <li key={algorithm} className="rounded-xl border bg-muted/30 p-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  HMAC-{algorithm}
                </Badge>
                <CopyButton text={value} />
              </div>
              <code className="mt-1 block break-all font-mono text-[11px]">{value}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
