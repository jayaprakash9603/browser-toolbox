import type { LucideIcon } from 'lucide-react'
import { CookieIcon, EyeOffIcon, MegaphoneOffIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AdblockState } from '@/core/adblock'
import { useAdblock } from '@/features/adblock/useAdblock'
import { Switch } from '@/shared/components/ui/switch'

interface SuiteRow {
  id: 'ads' | 'trackers' | 'cookies'
  icon: LucideIcon
  checked: (s: AdblockState) => boolean
  patch: (s: AdblockState, on: boolean) => Partial<AdblockState>
}

const ROWS: SuiteRow[] = [
  {
    id: 'ads',
    icon: MegaphoneOffIcon,
    checked: (s) => s.enabled && s.lists.ads,
    patch: (s, on) => (on ? { enabled: true, lists: { ...s.lists, ads: true } } : { lists: { ...s.lists, ads: false } }),
  },
  {
    id: 'trackers',
    icon: EyeOffIcon,
    checked: (s) => s.enabled && s.lists.privacy,
    patch: (s, on) =>
      on ? { enabled: true, lists: { ...s.lists, privacy: true } } : { lists: { ...s.lists, privacy: false } },
  },
  {
    id: 'cookies',
    icon: CookieIcon,
    checked: (s) => s.enabled && s.cookieBanners,
    patch: (_s, on) => (on ? { enabled: true, cookieBanners: true } : { cookieBanners: false }),
  },
]

/** Ad, tracker and cookie-consent blocking live in the ad blocker; mirrored here for one place to manage. */
export function ProtectionSuite() {
  const { t } = useTranslation()
  const { state, patch } = useAdblock()
  if (!state) return null
  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {ROWS.map((row) => {
        const Icon = row.icon
        return (
          <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{t(`protection.suite.${row.id}`)}</p>
              <p className="text-[11px] text-muted-foreground">{t(`protection.suite.${row.id}Description`)}</p>
            </div>
            <Switch
              checked={row.checked(state)}
              onCheckedChange={(on) => void patch(row.patch(state, on))}
              aria-label={t(`protection.suite.${row.id}`)}
            />
          </li>
        )
      })}
    </ul>
  )
}
