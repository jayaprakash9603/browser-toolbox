import { useTranslation } from 'react-i18next'

import type { ProtectionStats } from '@/core/protection'

export function RecentBlocked({ stats }: { stats: ProtectionStats | null }) {
  const { t } = useTranslation()
  if (!stats?.recent.length) {
    return (
      <p className="text-xs text-muted-foreground">{t('protection.recent.empty')}</p>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {stats.recent.map((entry) => (
        <li
          key={`${entry.host}-${entry.at}`}
          className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
        >
          <span className="truncate font-medium">{entry.host}</span>
          <span className="shrink-0 text-muted-foreground">{t(`protection.category.${entry.category}`)}</span>
        </li>
      ))}
    </ul>
  )
}
