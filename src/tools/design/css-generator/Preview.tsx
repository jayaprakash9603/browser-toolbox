import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'
import { mix, readableOn, type BgEffectState, type BgKind, type ButtonEffectState, type TextEffectState, type UiStyleState } from './effects'
import {
  animationValue,
  keyframesCss,
  previewCss,
  toStyle,
  type AnimationState,
  type CssResult,
  type FlexState,
  type GeneratorId,
  type GridState,
  type TextShadowState,
} from './generators'
import type { Stage } from './stage'

const PREVIEW_CLASS = 'cssgen-pv'
const FORCE_CLASS = 'cssgen-force-hover'

/** Generators whose output has nested rules, so the preview needs a real stylesheet. */
/** Backgrounds painted entirely by their colour stops, without the base colour. */
const BASELESS_BG: BgKind[] = ['animated-gradient', 'stripes', 'conic-spin']

const SCOPED_PREVIEW: GeneratorId[] = ['ui-style', 'background', 'button', 'hover', 'loader', 'text-effect']

function styleBackdrop(s: UiStyleState): ReactNode {
  switch (s.style) {
    case 'glass':
    case 'liquid-glass':
      return (
        <>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1e1b4b, #0f172a)' }} />
          <div className="absolute top-[8%] left-[12%] size-28 rounded-full bg-pink-500 @[480px]:size-36" />
          <div className="absolute right-[10%] bottom-[6%] size-24 rounded-full bg-sky-400 @[480px]:size-32" />
          <div className="absolute top-[40%] right-[30%] size-16 rounded-full" style={{ background: s.accent }} />
        </>
      )
    case 'neumorphism':
      return <div className="absolute inset-0" style={{ background: s.mode === 'dark' ? '#1f2633' : '#e4e9f0' }} />
    case 'aurora':
      return <div className="absolute inset-0" style={{ background: '#05070f' }} />
    case 'holographic':
      return <div className="absolute inset-0" style={{ background: '#f5f3ff' }} />
    case 'neon':
      return <div className="absolute inset-0" style={{ background: '#030008' }} />
    case 'retro':
      return <div className="absolute inset-0" style={{ background: '#008080' }} />
    default:
      return <div className="absolute inset-0" style={{ background: s.mode === 'dark' ? '#020617' : mix(s.accent, '#ffffff', 0.88) }} />
  }
}

const SAMPLE = 'linear-gradient(135deg, #6366f1, #a855f7 55%, #ec4899)'
const ITEM_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#0ea5e9']

interface PreviewProps {
  id: GeneratorId
  state: unknown
  result: CssResult
  stage: Stage
  playKey: number
  playing: boolean
  forceHover?: boolean
}

function Surface({ stage, className, style, children }: { stage: Stage; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div
      className={cn('flex items-center justify-center text-xs font-medium', stage === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-500', className)}
      style={style}
    >
      {children}
    </div>
  )
}

function Items({ count, layout }: { count: number; layout: 'flex' | 'grid' }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="flex min-h-8 min-w-8 items-center justify-center rounded-md px-2.5 text-xs font-semibold text-white shadow-sm"
      style={{
        backgroundColor: ITEM_COLORS[index % ITEM_COLORS.length],
        ...(layout === 'flex' ? { paddingBlock: 6 + (index % 3) * 6, fontSize: index % 2 ? 11 : 13 } : {}),
      }}
    >
      {index + 1}
    </div>
  ))
}

function ScopedPreview({ id, state, result, playKey, forceHover }: Omit<PreviewProps, 'stage' | 'playing'>) {
  const { t } = useTranslation()
  const cls = cn(PREVIEW_CLASS, forceHover && FORCE_CLASS)
  const css = <style>{previewCss(result, PREVIEW_CLASS, FORCE_CLASS)}</style>

  switch (id) {
    case 'ui-style': {
      const s = state as UiStyleState
      return (
        <>
          {styleBackdrop(s)}
          {css}
          <div key={playKey} className={cls} style={{ width: 'min(18rem, 86%)' }}>
            <h3 className="title">{t('css.sample.cardTitle')}</h3>
            <p className="text">{t('css.sample.cardText')}</p>
            <button type="button" className={cn('button', forceHover && FORCE_CLASS)}>
              {t('css.sample.cardAction')}
            </button>
          </div>
        </>
      )
    }
    case 'background': {
      const s = state as BgEffectState
      const ink = BASELESS_BG.includes(s.kind) ? '#ffffff' : readableOn(s.base)
      return (
        <div className="absolute inset-3 overflow-hidden rounded-lg">
          {css}
          <div key={playKey} className={cls} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className={cn('relative text-lg font-bold', ink === '#ffffff' && '[text-shadow:0_1px_8px_rgb(0_0_0/0.45)]')} style={{ color: ink }}>
              {t('css.sample.hero')}
            </span>
          </div>
        </div>
      )
    }
    case 'button': {
      const s = state as ButtonEffectState
      return (
        <>
          {css}
          <button key={playKey} type="button" className={cls}>
            {s.label || t('css.sample.button')}
          </button>
        </>
      )
    }
    case 'hover':
      return (
        <>
          {css}
          <div key={playKey} className={cls} style={{ width: 'min(16rem, 80%)' }}>
            <div className="mb-3 h-14 rounded-md" style={{ background: SAMPLE }} />
            <p className="text-sm font-semibold">{t('css.sample.cardTitle')}</p>
            <p className="text-xs opacity-70">{t('css.sample.hoverMe')}</p>
          </div>
        </>
      )
    case 'loader':
      return (
        <>
          {css}
          <div key={playKey} className={cls} role="status" aria-label={t('css.sample.loading')} />
        </>
      )
    case 'text-effect': {
      const s = state as TextEffectState
      const text = s.text || t('css.sample.text')
      return (
        <div className={cn('max-w-full px-4 text-center', s.kind === 'marquee' && 'w-full overflow-hidden px-0 text-left')}>
          {css}
          <span key={playKey} className={cls} data-text={text}>
            {text}
          </span>
        </div>
      )
    }
    default:
      return null
  }
}

export function Preview({ id, state, result, stage, playKey, playing, forceHover }: PreviewProps) {
  const { t } = useTranslation()
  const style = toStyle(result)

  if (SCOPED_PREVIEW.includes(id)) return <ScopedPreview id={id} state={state} result={result} playKey={playKey} forceHover={forceHover} />

  switch (id) {
    case 'gradient':
      return 'color' in style ? (
        <span className="px-4 text-center text-4xl leading-tight font-black tracking-tight @[480px]:text-5xl" style={style}>
          {t('css.sample.gradient')}
        </span>
      ) : (
        <div className="absolute inset-3 rounded-lg shadow-sm" style={style} />
      )
    case 'shadow':
      return <Surface stage={stage} className="size-24 rounded-2xl @[480px]:size-28" style={style} />
    case 'text-shadow': {
      const s = state as TextShadowState
      return (
        <span className="max-w-full truncate px-4 leading-tight" style={{ ...style, fontSize: s.size, fontWeight: s.weight }}>
          {s.text || t('css.sample.text')}
        </span>
      )
    }
    case 'radius':
    case 'clip-path':
      return <div className="size-28 @[480px]:size-32" style={{ background: SAMPLE, ...style }} />
    case 'border':
      return (
        <Surface stage={stage} className="size-28 @[480px]:size-32" style={style}>
          {t('css.sample.box')}
        </Surface>
      )
    case 'glass':
      return (
        <>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #312e81, #0f172a)' }} />
          <div className="absolute top-[12%] left-[18%] size-24 rounded-full bg-pink-500 @[480px]:size-28" />
          <div className="absolute right-[16%] bottom-[10%] size-20 rounded-full bg-sky-400 @[480px]:size-24" />
          <div className="absolute top-[45%] left-[48%] size-14 rounded-full bg-amber-400" />
          <div className="relative flex h-3/5 w-3/5 max-w-64 flex-col justify-end gap-1 p-3 text-white" style={style}>
            <span className="h-2 w-1/2 rounded-full bg-white/70" />
            <span className="h-2 w-1/3 rounded-full bg-white/40" />
          </div>
        </>
      )
    case 'filter':
      return (
        <div className="absolute inset-3 overflow-hidden rounded-lg" style={style}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #38bdf8 0%, #f9a8d4 70%, #fde68a 100%)' }} />
          <div className="absolute top-[18%] right-[22%] size-12 rounded-full bg-amber-300 shadow-[0_0_32px_#fcd34d]" />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-emerald-600" style={{ clipPath: 'polygon(0 60%, 22% 20%, 40% 55%, 62% 5%, 84% 50%, 100% 30%, 100% 100%, 0 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-emerald-800" style={{ clipPath: 'polygon(0 45%, 30% 10%, 55% 50%, 78% 20%, 100% 55%, 100% 100%, 0 100%)' }} />
        </div>
      )
    case 'transform':
      return (
        <div className="relative size-24 @[480px]:size-28">
          <div className="absolute inset-0 rounded-xl border-2 border-dashed border-slate-400/70" />
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl text-2xl font-black text-white shadow-lg transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{ background: SAMPLE, ...style }}
          >
            A
          </div>
        </div>
      )
    case 'animation': {
      const s = state as AnimationState
      const name = `cssgen-preview-${s.name}`
      return (
        <>
          <style>{keyframesCss(s.name).replace(`@keyframes ${s.name}`, `@keyframes ${name}`)}</style>
          <div
            key={playKey}
            className="size-16 rounded-2xl shadow-lg @[480px]:size-20"
            style={{
              background: SAMPLE,
              animation: animationValue(s).replace(s.name, name),
              animationPlayState: playing ? 'running' : 'paused',
            }}
          />
        </>
      )
    }
    case 'flexbox': {
      const s = state as FlexState
      return (
        <div className="absolute inset-3 overflow-auto rounded-lg border-2 border-dashed border-slate-400/60 p-2" style={style}>
          <Items count={s.items} layout="flex" />
        </div>
      )
    }
    case 'grid': {
      const s = state as GridState
      return (
        <div className="absolute inset-3 overflow-auto rounded-lg border-2 border-dashed border-slate-400/60 p-2" style={style}>
          <Items count={s.items} layout="grid" />
        </div>
      )
    }
    default:
      return null
  }
}
