import { useTranslation } from 'react-i18next'

import type { NetLive } from '@/core/netmon'

export function useLiveStatusLabel(live: NetLive | null): string {
  const { t } = useTranslation()
  return live ? t(`netmon.status.${live.status}`) : t('netmon.status.checking')
}
