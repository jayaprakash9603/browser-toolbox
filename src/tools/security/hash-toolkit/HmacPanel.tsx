import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EyeIcon, EyeOffIcon, KeyRoundIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { hmac, type HmacAlgorithm } from '@/core/engines/hash'
import { TextEditor } from '@/shared/components/TextEditor'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { PanelSection } from '@/shared/components/toolkit'

const ALGORITHMS: HmacAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512']

export function HmacPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [input, setInput] = useState('')
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [results, setResults] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    if (!input || !secret) {
      queueMicrotask(() => {
        if (live) setResults({})
      })
      return () => {
        live = false
      }
    }
    queueMicrotask(() => {
      if (live) setBusy(true)
    })
    void Promise.all(
      ALGORITHMS.map(async (algorithm) => {
        const result = await hmac(algorithm, input, secret)
        return [algorithm, result.ok ? result.value : result.error] as const
      }),
    )
      .then((entries) => {
        if (live) setResults(Object.fromEntries(entries))
      })
      .finally(() => {
        if (live) setBusy(false)
      })
    return () => {
      live = false
    }
  }, [input, secret])

  const ready = input.length > 0 && secret.length > 0

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('hashToolkit.hmac.title')} icon={<KeyRoundIcon />}>
        <p className="-mt-1 text-xs text-muted-foreground">{t('hashToolkit.hmac.subtitle')}</p>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('security.hashInput')}</span>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('hashToolkit.hmac.messagePlaceholder')}
            ariaLabel={t('security.hashInput')}
            minRows={3}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('security.secret')}</span>
          <div className="flex gap-1.5">
            <Input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={t('hashToolkit.hmac.secretPlaceholder')}
              aria-label={t('security.secret')}
              className="min-w-0 flex-1 font-mono text-xs"
              type={showSecret ? 'text' : 'password'}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-pressed={showSecret}
              aria-label={t('hashToolkit.hmac.toggleSecret')}
              onClick={() => setShowSecret((value) => !value)}
            >
              {showSecret ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </Button>
          </div>
        </div>
      </PanelSection>

      {!ready && (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t('hashToolkit.hmac.empty')}
        </p>
      )}

      {ready && (
        <ul className="flex flex-col gap-2" aria-busy={busy}>
          <AnimatePresence initial={false}>
            {ALGORITHMS.map((algorithm, index) => {
              const value = results[algorithm]
              if (!value && !busy) return null
              return (
                <motion.li
                  key={algorithm}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22, delay: reduce ? 0 : index * 0.04 }}
                  className="rounded-xl border bg-card p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      HMAC-{algorithm}
                    </Badge>
                    {busy && !value ? (
                      <span className="text-[10px] text-muted-foreground">{t('hashToolkit.hmac.computing')}</span>
                    ) : value ? (
                      <CopyButton text={value} />
                    ) : null}
                  </div>
                  <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed">{value ?? '…'}</code>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
