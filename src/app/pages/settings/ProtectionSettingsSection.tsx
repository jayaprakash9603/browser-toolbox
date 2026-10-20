import { ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { useProtection } from '@/features/protection/useProtection'
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

export function ProtectionSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useProtection()

  if (!state) return null

  return (
    <>
      <SettingRow
        searchId="protectionEnabled"
        label={t('settings.protectionEnabled')}
        description={t('settings.protectionEnabledDescription')}
      >
        <Switch
          checked={state.enabled}
          onCheckedChange={(enabled) => void patch({ enabled })}
          aria-label={t('settings.protectionEnabled')}
        />
      </SettingRow>
      <Link
        to="/tools/privacy/web-protection"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        {t('settings.protectionOpenTool')}
        <ArrowRightIcon className="size-3" />
      </Link>
    </>
  )
}
