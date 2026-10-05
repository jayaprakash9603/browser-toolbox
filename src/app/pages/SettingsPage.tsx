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
import { AppLoadingSkeleton } from '@/shared/components/AppLoadingSkeleton'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export default function SettingsPage() {
  const { t } = useTranslation()
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

      <SettingRow label={t('settings.theme')} description={t('settings.themeDescription')}>
        <Tabs
          value={settings.theme}
          onValueChange={(value) => void update({ theme: value as ThemeMode })}
        >
          <TabsList>
            <TabsTrigger value="light">{t('settings.light')}</TabsTrigger>
            <TabsTrigger value="dark">{t('settings.dark')}</TabsTrigger>
            <TabsTrigger value="system">{t('settings.system')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </SettingRow>

      <SettingRow label={t('settings.density')} description={t('settings.densityDescription')}>
        <Tabs
          value={settings.density}
          onValueChange={(value) => void update({ density: value as Density })}
        >
          <TabsList>
            <TabsTrigger value="compact">{t('settings.compact')}</TabsTrigger>
            <TabsTrigger value="comfortable">{t('settings.comfortable')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </SettingRow>

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.clipboard')}
      </h2>
      <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
        {t('settings.clipboardPrivacy')}
      </p>

      <SettingRow label={t('settings.clipboardHistory')} description={t('settings.clipboardHistoryDescription')}>
        <Switch
          checked={settings.clipboardHistoryEnabled}
          onCheckedChange={(checked) => void update({ clipboardHistoryEnabled: checked })}
          aria-label={t('settings.enableClipboardHistory')}
        />
      </SettingRow>

      <SettingRow label={t('settings.historySize')} description={t('settings.historySizeDescription')}>
        <Input
          type="number"
          min={10}
          max={1000}
          value={settings.clipboardHistoryLimit}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (Number.isFinite(value) && value >= 10 && value <= 1000) {
              void update({ clipboardHistoryLimit: value })
            }
          }}
          className="w-20"
          aria-label={t('settings.clipboardHistorySize')}
        />
      </SettingRow>

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.data')}
      </h2>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={() => setConfirm('clipboard')}>
          {t('settings.clearClipboardHistory')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirm('recent')}>
          {t('settings.clearRecentTools')}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setConfirm('reset')}>
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

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
