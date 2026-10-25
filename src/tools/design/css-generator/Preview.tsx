import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'
import {
  animationValue,
  keyframesCss,
  toStyle,
  type AnimationState,
  type CssResult,
  type FlexState,
  type GeneratorId,
  type GridState,
  type TextShadowState,
} from './generators'
import type { Stage } from './stage'

const SAMPLE = 'linear-gradient(135deg, #6366f1, #a855f7 55%, #ec4899)'
const ITEM_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#0ea5e9']

interface PreviewProps {
  id: GeneratorId
  state: unknown
  result: CssResult
  stage: Stage
  playKey: number
  playing: boolean
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

export function Preview({ id, state, result, stage, playKey, playing }: PreviewProps) {
  const { t } = useTranslation()
  const style = toStyle(result)

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
  }
}
