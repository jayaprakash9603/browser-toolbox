import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import '@/app/demos/i18n'
import { cn } from '@/shared/utils/cn'

import { PanelChrome } from './stage/chrome'
import { useToolMeta } from './stage/context'

const WIDTH = 520
const HEIGHT = 420

/** Still frame in the same geometry as a `DemoStage`: shown while a demo loads, or for tools without one. */
export function DemoPoster({
  variant,
  description,
  loading = false,
}: {
  variant: 'card' | 'player'
  description: string
  loading?: boolean
}) {
  const { t } = useTranslation()
  const meta = useToolMeta()
  const Icon = meta.icon
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const update = () => setScale(Math.min(1.4, frame.clientWidth / WIDTH))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <figure
      data-demo-stage=""
      aria-label={loading ? t('demo.loading') : meta.name}
      aria-busy={loading || undefined}
      className="relative m-0"
    >
      <div
        className={cn(
          'relative overflow-hidden bg-surface',
          variant === 'player' && 'rounded-[22px] border border-line-strong shadow-[0_30px_90px_-40px_rgb(0_0_0/0.9)]',
        )}
      >
        <div ref={frameRef} className="relative w-full overflow-hidden" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 origin-top-left text-[13px] text-ink select-none"
            style={{
              width: WIDTH,
              height: HEIGHT,
              transform: `scale(${scale || 1})`,
              visibility: scale ? 'visible' : 'hidden',
            }}
          >
            <PanelChrome>
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-line bg-canvas/60 px-10 text-center">
                <span
                  className={cn(
                    'flex size-16 items-center justify-center rounded-2xl border border-line-strong bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]',
                    loading && 'animate-pulse motion-reduce:animate-none',
                  )}
                >
                  <Icon aria-hidden className="size-7" strokeWidth={1.6} />
                </span>
                <p className="m-0 max-w-[24rem] text-[13px] leading-relaxed text-ink-soft">{description}</p>
                {loading ? (
                  <span className="flex w-40 flex-col items-center gap-1.5">
                    <span className="h-1.5 w-full animate-pulse rounded-full bg-ink/10 motion-reduce:animate-none" />
                    <span className="h-1.5 w-2/3 animate-pulse rounded-full bg-ink/10 motion-reduce:animate-none" />
                  </span>
                ) : (
                  <p className="m-0 text-[11px] text-muted">{t('demo.noDemo')}</p>
                )}
              </div>
            </PanelChrome>
          </div>
        </div>
        {variant === 'player' ? <div aria-hidden="true" className="h-[49px] border-t border-line" /> : null}
      </div>
    </figure>
  )
}
