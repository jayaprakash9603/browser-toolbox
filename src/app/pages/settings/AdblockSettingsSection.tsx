import { ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { useAdblock } from '@/features/adblock/useAdblock'
import { Switch } from '@/shared/components/ui/switch'

function SettingRow({
  searchId,
  label,
  description,
  children,
}: {
  searchId?: string
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4" data-search-id={searchId}>
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function AdblockSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useAdblock()

  if (!state) return null

  return (
    <>
      <SettingRow
        searchId="adblockEnabled"
        label={t('settings.adblockEnabled')}
        description={t('settings.adblockEnabledDescription')}
      >
        <Switch
          checked={state.enabled}
          onCheckedChange={(enabled) => void patch({ enabled })}
          aria-label={t('settings.adblockEnabled')}
        />
      </SettingRow>

      <SettingRow
        searchId="adblockYoutube"
        label={t('settings.adblockYoutube')}
        description={t('settings.adblockYoutubeDescription')}
      >
        <Switch
          checked={state.youtubeEnabled && state.lists.youtube}
          disabled={!state.enabled}
          onCheckedChange={(on) =>
            void patch({ youtubeEnabled: on, lists: { ...state.lists, youtube: on } })
          }
          aria-label={t('settings.adblockYoutube')}
        />
      </SettingRow>

      <Link
        to="/tools/privacy/ad-blocker"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        {t('settings.adblockOpenTool')}
        <ArrowRightIcon className="size-3" />
      </Link>
    </>
  )
}
