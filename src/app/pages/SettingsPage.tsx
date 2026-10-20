import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { clearHistory } from '@/core/clipboard'
import { clearAll as clearStorage, initStorage } from '@/core/storage'
import { clearRecentTools } from '@/features/recent-tools/recentToolsService'
import {
  getSettings,
  resetSettings,
  updateSettings,
  type Density,
  type Settings,
  type ThemeMode,
} from '@/features/settings/settingsService'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { BackButton } from '@/shared/components/BackButton'
import { PalettePicker } from '@/shared/components/settings/PalettePicker'
import type { PaletteId } from '@/shared/lib/theme/palettes'
import { AppLoadingSkeleton } from '@/shared/components/AppLoadingSkeleton'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Separator } from '@/shared/components/ui/separator'
import { Switch } from '@/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { AdblockSettingsSection } from '@/app/pages/settings/AdblockSettingsSection'
import { ProtectionSettingsSection } from '@/app/pages/settings/ProtectionSettingsSection'
import { KeyboardShortcutsSettingsCard } from '@/app/pages/settings/KeyboardShortcutsSettingsCard'
import { PipSettingsSection } from '@/app/pages/settings/PipSettingsSection'
import { SaveImageAsSettingsSection } from '@/app/pages/settings/SaveImageAsSettingsSection'
import { SitesSettingsSection } from '@/app/pages/settings/SitesSettingsSection'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'

export default function SettingsPage() {
  const { t } = useTranslation()
  useFocusTarget()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [confirm, setConfirm] = useState<'clipboard' | 'recent' | 'reset' | null>(null)

  useEffect(() => {
    void initStorage().then(() => getSettings().then(setSettings))
  }, [])

  if (!settings) return <AppLoadingSkeleton variant="settings" label={t('nav.loading')} />

  const update = async (patch: Partial<Settings>) => {
    setSettings(await updateSettings(patch))
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3"><BackButton /></div>
      <h1 className="mb-1 text-sm font-semibold">{t('settings.title')}</h1>
      <p className="mb-4 text-xs text-muted-foreground">{t('settings.description')}</p>

      <SettingRow searchId="theme" label={t('settings.theme')} description={t('settings.themeDescription')}>
        <Select
          value={settings.theme}
          onValueChange={(value) => void update({ theme: value as ThemeMode })}
        >
          <SelectTrigger className="w-[9.5rem]" aria-label={t('settings.theme')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">{t('settings.light')}</SelectItem>
            <SelectItem value="dark">{t('settings.dark')}</SelectItem>
            <SelectItem value="system">{t('settings.system')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow searchId="density" label={t('settings.density')} description={t('settings.densityDescription')}>
        <Select
          value={settings.density}
          onValueChange={(value) => void update({ density: value as Density })}
        >
          <SelectTrigger className="w-[9.5rem]" aria-label={t('settings.density')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">{t('settings.compact')}</SelectItem>
            <SelectItem value="comfortable">{t('settings.comfortable')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <div className="mb-4 @container" data-search-id="palette">
        <p className="mb-1 text-xs font-medium">{t('settings.palette')}</p>
        <p className="mb-2 text-[11px] text-muted-foreground">{t('settings.paletteDescription')}</p>
        <PalettePicker
          value={settings.palette}
          onChange={(palette) => void update({ palette: palette as PaletteId })}
        />
      </div>

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.adblockSection')}
      </h2>
      <p className="mb-3 text-[11px] text-muted-foreground">{t('settings.adblockSectionDescription')}</p>
      <AdblockSettingsSection />

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.protectionSection')}
      </h2>
      <p className="mb-3 text-[11px] text-muted-foreground">{t('settings.protectionSectionDescription')}</p>
      <ProtectionSettingsSection />
      <Separator className="my-4" />
      <SitesSettingsSection />

      <Separator className="my-4" />
      <KeyboardShortcutsSettingsCard />
      <Separator className="my-4" />
      <SaveImageAsSettingsSection />
      <PipSettingsSection />

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.clipboard')}
      </h2>
      <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
        {t('settings.clipboardPrivacy')}
      </p>

      <SettingRow
        searchId="clipboardHistory"
        label={t('settings.clipboardHistory')}
        description={t('settings.clipboardHistoryDescription')}
      >
        <Switch
          checked={settings.clipboardHistoryEnabled}
          onCheckedChange={(checked) => void update({ clipboardHistoryEnabled: checked })}
          aria-label={t('settings.enableClipboardHistory')}
        />
      </SettingRow>

      <SettingRow
        searchId="historySize"
        label={t('settings.historySize')}
        description={t('settings.historySizeDescription')}
      >
        <HistorySizeField
          saved={settings.clipboardHistoryLimit}
          label={t('settings.clipboardHistorySize')}
          onCommit={(value) => void update({ clipboardHistoryLimit: value })}
        />
      </SettingRow>

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.data')}
      </h2>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" data-search-id="clearClipboard" onClick={() => setConfirm('clipboard')}>
          {t('settings.clearClipboardHistory')}
        </Button>
        <Button variant="outline" size="sm" data-search-id="clearRecent" onClick={() => setConfirm('recent')}>
          {t('settings.clearRecentTools')}
        </Button>
        <Button variant="destructive" size="sm" data-search-id="resetAll" onClick={() => setConfirm('reset')}>
          {t('settings.resetAll')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === 'clipboard'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t('settings.clearHistoryTitle')}
        description={t('settings.clearHistoryDescription')}
        confirmLabel={t('settings.clearHistoryConfirm')}
        destructive
        onConfirm={() => void clearHistory(true)}
      />
      <ConfirmDialog
        open={confirm === 'recent'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t('settings.clearRecentTitle')}
        description={t('settings.clearRecentDescription')}
        confirmLabel={t('common.clear')}
        destructive
        onConfirm={() => void clearRecentTools()}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t('settings.resetTitle')}
        description={t('settings.resetDescription')}
        confirmLabel={t('settings.resetConfirm')}
        destructive
        onConfirm={() => {
          void clearStorage()
            .then(() => resetSettings())
            .then(setSettings)
        }}
      />
    </div>
  )
}

function HistorySizeField({
  saved,
  label,
  onCommit,
}: {
  saved: number
  label: string
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(saved))
  const [seen, setSeen] = useState(saved)
  if (saved !== seen) {
    setSeen(saved)
    setText(String(saved))
  }
  return (
    <NumberField
      value={text}
      min={10}
      max={1000}
      className="w-20"
      ariaLabel={label}
      onChange={(next) => {
        setText(next)
        const parsed = parseNumberInRange(next, 10, 1000)
        if (parsed !== null) onCommit(parsed)
      }}
    />
  )
}

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
