import { useTranslation } from 'react-i18next'

import { formatAvailability, type HeatCell } from '@/core/netmon'
import { availabilityColor } from '@/features/netmon/statusStyle'
import { cn } from '@/shared/utils/cn'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function HourHeatmap({ cells }: { cells: HeatCell[] }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0.5" aria-label={t('netmon.stats.heatmap')}>
        <thead>
          <tr>
            <th className="w-6" />
            {Array.from({ length: 24 }, (_, hour) => (
              <th
                key={hour}
                className="px-0 text-center text-[9px] font-medium text-muted-foreground"
              >
                {hour % 3 === 0 ? hour : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((label, weekday) => (
            <tr key={weekday}>
              <th className="pr-1 text-left text-[10px] font-medium text-muted-foreground">{label}</th>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = cells[weekday * 24 + hour]
                const empty = cell.availability === null
                return (
                  <td key={hour} className="p-0">
                    <span
                      className={cn(
                        'block h-3.5 w-full rounded-[3px]',
                        empty && 'bg-muted/50',
                      )}
                      style={empty ? undefined : { backgroundColor: availabilityColor(cell.availability) }}
                      title={`${DAYS[weekday]} ${hour}:00 · ${formatAvailability(cell.availability)}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-muted-foreground">{t('netmon.stats.heatmapHint')}</p>
    </div>
  )
}
