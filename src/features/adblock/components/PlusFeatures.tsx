import type { LucideIcon } from 'lucide-react'
import {
  BellOffIcon,
  CookieIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  MonitorPlayIcon,
  RadarIcon,
  SparklesIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AdblockState } from '@/core/adblock'
import { Switch } from '@/shared/components/ui/switch'

interface Feature {
  id: string
  icon: LucideIcon
  labelKey: string
  descKey: string
  checked: (state: AdblockState) => boolean
  patch: (state: AdblockState, on: boolean) => Partial<AdblockState>
}

const FEATURES: Feature[] = [
  {
    id: 'youtube',
    icon: MonitorPlayIcon,
    labelKey: 'settings.adblockYoutube',
    descKey: 'settings.adblockYoutubeDescription',
    checked: (s) => s.youtubeEnabled && s.lists.youtube,
    patch: (s, on) => ({ youtubeEnabled: on, lists: { ...s.lists, youtube: on } }),
  },
  {
    id: 'popups',
    icon: ExternalLinkIcon,
    labelKey: 'adblock.plus.popups',
    descKey: 'adblock.plus.popupsDescription',
    checked: (s) => s.blockPopups,
    patch: (_s, on) => ({ blockPopups: on }),
  },
  {
    id: 'cookies',
    icon: CookieIcon,
    labelKey: 'adblock.plus.cookies',
    descKey: 'adblock.plus.cookiesDescription',
    checked: (s) => s.cookieBanners,
    patch: (_s, on) => ({ cookieBanners: on }),
  },
  {
    id: 'distractions',
    icon: EyeOffIcon,
    labelKey: 'adblock.plus.distractions',
    descKey: 'adblock.plus.distractionsDescription',
    checked: (s) => s.distractions,
    patch: (_s, on) => ({ distractions: on }),
  },
  {
    id: 'tracking',
    icon: RadarIcon,
    labelKey: 'adblock.plus.tracking',
    descKey: 'adblock.plus.trackingDescription',
    checked: (s) => s.lists.privacy,
    patch: (s, on) => ({ lists: { ...s.lists, privacy: on } }),
  },
  {
    id: 'notifications',
    icon: BellOffIcon,
    labelKey: 'adblock.plus.notifications',
    descKey: 'adblock.plus.notificationsDescription',
    checked: (s) => s.blockNotifications,
    patch: (_s, on) => ({ blockNotifications: on }),
  },
]

export function PlusFeatures({
  state,
  onPatch,
}: {
  state: AdblockState
  onPatch: (patch: Partial<AdblockState>) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <SparklesIcon className="size-3.5 text-amber-500" />
        <h3 className="text-xs font-semibold">{t('adblock.plus.title')}</h3>
        <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
          {t('adblock.plus.badge')}
        </span>
      </div>
      <ul className="flex flex-col divide-y">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <li
              key={feature.id}
              className="flex items-center gap-3 py-2"
              data-search-id={feature.id === 'youtube' ? 'plus-youtube' : `plus-${feature.id}`}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{t(feature.labelKey)}</p>
                <p className="text-[11px] text-muted-foreground">{t(feature.descKey)}</p>
              </div>
              <Switch
                checked={feature.checked(state)}
                disabled={!state.enabled}
                onCheckedChange={(on) => onPatch(feature.patch(state, on))}
                aria-label={t(feature.labelKey)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
