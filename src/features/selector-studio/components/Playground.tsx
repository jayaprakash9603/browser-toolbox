import { lazy, Suspense, useEffect, useRef, useState } from 'react'
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
  onClose,
}: {
  candidate: SelectorCandidate | null
  onValidate: (kind: 'css' | 'xpath', expression: string) => void
  onReset: () => void
  onClose?: () => void
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<'css' | 'xpath'>(candidate?.kind ?? 'css')
  const [value, setValue] = useState(candidate?.expression ?? '')
  const seedId = useRef(candidate?.id)

  useEffect(() => {
    if (!candidate) return
    const manualEdit = candidate.id.startsWith('edit:')
    if (manualEdit && seedId.current?.startsWith('edit:')) return
    if (candidate.id !== seedId.current) {
      seedId.current = candidate.id
      setKind(candidate.kind)
      setValue(candidate.expression)
    }
  }, [candidate])

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold text-[#202124]">{t('studio.playground')}</h3>
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
          {onClose ? (
            <Button size="xs" variant="outline" onClick={onClose} className="ml-1">
              {t('studio.hub.closePlayground')}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-[11px] text-[#5f6368]">{t('studio.playgroundHint')}</p>
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
