import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { formatClockDuration, type NetStatus, type StatusMix } from '@/core/netmon'
import { statusColor } from '@/features/netmon/statusStyle'

const ORDER: NetStatus[] = ['online', 'lan', 'offline', 'nodata']

export function StatusMixChart({ mix }: { mix: StatusMix }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const total = ORDER.reduce((sum, key) => sum + mix[key], 0)
  if (total === 0) return null
  const watched = mix.online + mix.lan + mix.offline
  const uptime = watched > 0 ? `${Math.round((mix.online / watched) * 100)}%` : '—'

  const r = 28
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <figure className="flex items-center gap-3">
      <svg
        viewBox="0 0 72 72"
        className="size-16 shrink-0"
        role="img"
        aria-label={t('netmon.insights.mixLabel')}
      >
        <g transform="rotate(-90 36 36)">
          {ORDER.map((status) => {
            const count = mix[status]
            if (count === 0) return null
            const len = (count / total) * c
            const dash = `${len} ${c - len}`
            const el = (
              <circle
                key={status}
                cx="36"
                cy="36"
                r={r}
                fill="none"
                stroke={statusColor(status)}
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
            y="41"
            textAnchor="middle"
            className="fill-foreground text-[11px] font-semibold tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {uptime}
          </motion.text>
        )}
      </svg>
      <figcaption className="flex min-w-0 flex-1 flex-col gap-1 text-[11px]">
        {ORDER.map((status) =>
          mix[status] > 0 ? (
            <span key={status} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: statusColor(status) }}
                />
                {t(`netmon.statusShort.${status}`)}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatClockDuration(mix[status])}
              </span>
            </span>
          ) : null,
        )}
      </figcaption>
    </figure>
  )
}
