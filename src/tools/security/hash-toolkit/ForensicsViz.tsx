import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

export function EntropyGauge({ entropy, className }: { entropy: number; className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const ratio = Math.min(1, entropy / 8)
  const verdict = entropy < 5 ? 'low' : entropy < 7.2 ? 'mid' : 'high'
  const color =
    verdict === 'low'
      ? 'var(--hero-from, var(--primary))'
      : verdict === 'mid'
        ? 'var(--hero-via, var(--primary))'
        : 'var(--hero-to, var(--chart-2, var(--primary)))'

  return (
    <figure className={cn('flex flex-col items-center gap-1', className)}>
      <svg
        viewBox="0 0 120 68"
        className="w-full max-w-[9rem]"
        role="img"
        aria-label={t('hashToolkit.viz.entropyValue', { value: entropy.toFixed(2) })}
      >
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <motion.path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: ratio }}
          transition={{ duration: 0.85, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <text
          x="60"
          y="54"
          textAnchor="middle"
          className="fill-foreground text-[18px] font-semibold tabular-nums"
        >
          {entropy.toFixed(2)}
        </text>
        <text x="60" y="66" textAnchor="middle" className="fill-muted-foreground text-[7px]">
          {t('hashToolkit.viz.bitsPerByte')}
        </text>
      </svg>
      <figcaption className="text-center text-[10px] font-medium text-muted-foreground">
        {t(`hashToolkit.viz.entropy.${verdict}`)}
      </figcaption>
    </figure>
  )
}

export function ByteHistogramChart({
  histogram,
  className,
}: {
  histogram: Uint32Array
  className?: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const max = Math.log1p(Math.max(...histogram))
  const tone = (byte: number) =>
    byte < 32 || byte === 127
      ? 'fill-amber-500'
      : byte < 127
        ? 'fill-emerald-500'
        : 'fill-violet-500'

  return (
    <figure className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}>
      <svg
        viewBox="0 0 256 64"
        preserveAspectRatio="none"
        className="h-20 w-full rounded-lg border bg-muted/20"
        role="img"
        aria-label={t('hashToolkit.viz.histogram')}
      >
        <motion.g
          style={{ transformOrigin: '0 64px', transformBox: 'view-box' }}
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {Array.from(histogram, (count, byte) => {
            const height = max > 0 ? (Math.log1p(count) / max) * 62 : 0
            return height > 0 ? (
              <rect key={byte} x={byte} y={64 - height} width={0.95} height={height} className={tone(byte)} />
            ) : null
          })}
        </motion.g>
      </svg>
      <figcaption className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          <span className="size-1.5 rounded-sm bg-amber-500" aria-hidden />
          {t('hashToolkit.viz.control')}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="size-1.5 rounded-sm bg-emerald-500" aria-hidden />
          {t('hashToolkit.viz.ascii')}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="size-1.5 rounded-sm bg-violet-500" aria-hidden />
          {t('hashToolkit.viz.high')}
        </span>
      </figcaption>
    </figure>
  )
}

/** Stacked bar: share of bytes that match vs differ (compare mode). */
export function CompareDiffBar({
  identical,
  sizeA,
  sizeB,
  differingBytes,
}: {
  identical: boolean
  sizeA: number
  sizeB: number
  differingBytes: number
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const shared = Math.min(sizeA, sizeB)
  const matchRatio = identical ? 1 : shared === 0 ? 0 : Math.max(0, (shared - differingBytes) / shared)

  return (
    <figure className="space-y-1.5">
      <div className="flex h-3 overflow-hidden rounded-full border bg-muted/40">
        <motion.div
          className="h-full bg-emerald-500"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${matchRatio * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {!identical && (
          <motion.div
            className="h-full flex-1 bg-red-500/80"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          />
        )}
      </div>
      <figcaption className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{t('hashToolkit.viz.matching', { pct: Math.round(matchRatio * 100) })}</span>
        {!identical && (
          <span>{t('hashToolkit.viz.differing', { count: differingBytes.toLocaleString() })}</span>
        )}
      </figcaption>
    </figure>
  )
}

export function IntegrityDonut({
  verified,
  modified,
  missing,
}: {
  verified: number
  modified: number
  missing: number
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const total = verified + modified + missing
  if (total === 0) return null

  const r = 28
  const c = 2 * Math.PI * r
  const slices = [
    { count: verified, color: 'var(--color-emerald-500, #10b981)', key: 'verified' as const },
    { count: modified, color: 'var(--color-red-500, #ef4444)', key: 'modified' as const },
    { count: missing, color: 'var(--color-muted-foreground, #71717a)', key: 'missing' as const },
  ]
  let offset = 0

  return (
    <figure className="flex items-center gap-3 rounded-xl border bg-card/80 p-3">
      <svg viewBox="0 0 72 72" className="size-16 shrink-0" role="img" aria-label={t('hashToolkit.viz.integritySummary')}>
        <g transform="rotate(-90 36 36)">
          {slices.map(({ count, color, key }) => {
            if (count === 0) return null
            const len = (count / total) * c
            const dash = `${len} ${c - len}`
            const el = (
              <circle
                key={key}
                cx="36"
                cy="36"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += len
            return el
          })}
        </g>
        {!reduce && (
          <motion.text
            x="36"
            y="40"
            textAnchor="middle"
            className="fill-foreground text-[14px] font-semibold tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {total}
          </motion.text>
        )}
      </svg>
      <figcaption className="flex min-w-0 flex-1 flex-col gap-1 text-[11px]">
        {slices.map(({ count, key }) =>
          count > 0 ? (
            <span key={key} className="flex items-center justify-between gap-2">
              <span>{t(`hashToolkit.integrity.status.${key === 'verified' ? 'verified' : key}`)}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </span>
          ) : null,
        )}
      </figcaption>
    </figure>
  )
}

export function HexHeadPreview({ head }: { head: Uint8Array }) {
  const { t } = useTranslation()
  if (head.length === 0) return null
  const rows = Math.min(4, Math.ceil(head.length / 16))
  return (
    <div className="rounded-lg border bg-muted/20 p-2 font-mono text-[10px] leading-relaxed">
      <p className="mb-1 text-[9px] font-medium text-muted-foreground">{t('hashToolkit.viz.headBytes')}</p>
      {Array.from({ length: rows }, (_, row) => {
        const base = row * 16
        const slice = head.subarray(base, base + 16)
        return (
          <div key={base} className="flex gap-2">
            <span className="w-6 shrink-0 text-muted-foreground">{base.toString(16).padStart(2, '0')}</span>
            <span className="break-all">
              {[...slice].map((b) => b.toString(16).padStart(2, '0')).join(' ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
