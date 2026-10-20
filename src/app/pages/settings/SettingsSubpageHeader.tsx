import { useTranslation } from 'react-i18next'

import { BackButton } from '@/shared/components/BackButton'

interface SettingsSubpageHeaderProps {
  title: string
  description?: string
  searchId?: string
}

/** Compact settings sub-route header: back + breadcrumb + title on one block. */
export function SettingsSubpageHeader({ title, description, searchId }: SettingsSubpageHeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="mb-3 flex items-start gap-2" data-search-id={searchId}>
      <BackButton to="/settings" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
          {t('settings.title')}
        </p>
        <h1 className="mt-1 truncate text-sm font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </header>
  )
}
