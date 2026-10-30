import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SelectorCandidate } from '@/core/engines/selector-studio'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'

const CodeEditor = lazy(() =>
  import('@/shared/components/CodeEditor').then((module) => ({ default: module.CodeEditor })),
)

export function Playground({
  candidate,
  onValidate,
  onReset,
}: {
  candidate: SelectorCandidate | null
  onValidate: (kind: 'css' | 'xpath', expression: string) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<'css' | 'xpath'>(candidate?.kind ?? 'css')
  const [value, setValue] = useState(candidate?.expression ?? '')

  useEffect(() => {
    if (!candidate) return
    setKind(candidate.kind)
    setValue(candidate.expression)
  }, [candidate])

  return (
    <section className="flex flex-col gap-2 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground">{t('studio.playground')}</h3>
        <div className="ml-auto flex gap-1">
          {(['css', 'xpath'] as const).map((item) => (
            <Button
              key={item}
              size="xs"
              variant={kind === item ? 'default' : 'outline'}
              onClick={() => setKind(item)}
            >
              {t(`studio.kind.${item}`)}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('studio.playgroundHint')}</p>
      <Suspense fallback={<div className="h-24 rounded-md border bg-muted/30" />}>
        <CodeEditor
          value={value}
          language={kind === 'css' ? 'css' : 'xml'}
          ariaLabel={t('studio.expression')}
          wrap
          className={cn('min-h-24 overflow-hidden rounded-md border')}
          onChange={(next) => {
            setValue(next)
            onValidate(kind, next)
          }}
        />
      </Suspense>
      <div className="flex items-center gap-1.5">
        <CopyButton text={value} size="xs" />
        <Button size="xs" variant="outline" onClick={onReset} disabled={!candidate}>
          {t('studio.reset')}
        </Button>
      </div>
    </section>
  )
}
