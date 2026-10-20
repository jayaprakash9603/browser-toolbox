import {
  BrushIcon,
  ClipboardIcon,
  CpuIcon,
  GlobeIcon,
  KeyboardIcon,
  ShieldCheckIcon,
  ShieldIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
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
import { SettingsGroup, SettingsRow } from '@/app/pages/settings/ui'
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

  const sections: { id: string; icon: LucideIcon; label: string }[] = [
    { id: 'appearance', icon: BrushIcon, label: t('settings.groupAppearance') },
    { id: 'adblock', icon: ShieldCheckIcon, label: t('settings.adblockSection') },
    { id: 'protection', icon: ShieldIcon, label: t('settings.protectionSection') },
    { id: 'sites', icon: GlobeIcon, label: t('settings.groupSites') },
    { id: 'features', icon: KeyboardIcon, label: t('settings.groupFeatures') },
    { id: 'clipboard', icon: ClipboardIcon, label: t('settings.clipboard') },
    { id: 'data', icon: Trash2Icon, label: t('settings.data') },
  ]

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex items-center gap-2 px-4 pt-3">
          <BackButton />
          <div className="min-w-0">
            <h1 className="text-base leading-tight font-semibold">{t('settings.title')}</h1>
            <p className="truncate text-xs text-muted-foreground">{t('settings.description')}</p>
          </div>
        </div>
        <nav
          aria-label={t('settings.jumpTo')}
          className="flex gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none]"
        >
          {sections.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => jump(id)}
              className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-6 p-4 pb-8">
        <SettingsGroup
          id="appearance"
          icon={BrushIcon}
          title={t('settings.groupAppearance')}
          description={t('settings.groupAppearanceDescription')}
        >
          <SettingsRow searchId="theme" label={t('settings.theme')} description={t('settings.themeDescription')}>
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
          </SettingsRow>

          <SettingsRow searchId="density" label={t('settings.density')} description={t('settings.densityDescription')}>
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
          </SettingsRow>

          <SettingsRow
            searchId="palette"
            stacked
            label={t('settings.palette')}
            description={t('settings.paletteDescription')}
          >
            <div className="@container">
              <PalettePicker
                value={settings.palette}
                onChange={(palette) => void update({ palette: palette as PaletteId })}
              />
            </div>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup
          id="adblock"
          icon={ShieldCheckIcon}
          title={t('settings.adblockSection')}
          description={t('settings.adblockSectionDescription')}
        >
          <AdblockSettingsSection />
        </SettingsGroup>

        <SettingsGroup
          id="protection"
          icon={ShieldIcon}
          title={t('settings.protectionSection')}
          description={t('settings.protectionSectionDescription')}
        >
          <ProtectionSettingsSection />
        </SettingsGroup>

        <SettingsGroup
          id="sites"
          icon={GlobeIcon}
          title={t('settings.groupSites')}
          description={t('settings.groupSitesDescription')}
        >
          <SitesSettingsSection />
        </SettingsGroup>

        <SettingsGroup
          id="features"
          icon={CpuIcon}
          title={t('settings.groupFeatures')}
          description={t('settings.groupFeaturesDescription')}
        >
          <KeyboardShortcutsSettingsCard />
          <SaveImageAsSettingsSection />
          <PipSettingsSection />
        </SettingsGroup>

        <SettingsGroup id="clipboard" icon={ClipboardIcon} title={t('settings.clipboard')}>
          <p className="bg-amber-500/10 px-4 py-2.5 text-xs leading-snug text-amber-800 dark:text-amber-300">
            {t('settings.clipboardPrivacy')}
          </p>
          <SettingsRow
            searchId="clipboardHistory"
            label={t('settings.clipboardHistory')}
            description={t('settings.clipboardHistoryDescription')}
          >
            <Switch
              checked={settings.clipboardHistoryEnabled}
              onCheckedChange={(checked) => void update({ clipboardHistoryEnabled: checked })}
              aria-label={t('settings.enableClipboardHistory')}
            />
          </SettingsRow>
          <SettingsRow
            searchId="historySize"
            label={t('settings.historySize')}
            description={t('settings.historySizeDescription')}
          >
            <HistorySizeField
              saved={settings.clipboardHistoryLimit}
              label={t('settings.clipboardHistorySize')}
              onCommit={(value) => void update({ clipboardHistoryLimit: value })}
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup
          id="data"
          icon={Trash2Icon}
          tone="danger"
          title={t('settings.data')}
          description={t('settings.groupDataDescription')}
        >
          <div className="flex flex-col gap-2 p-3">
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
        </SettingsGroup>
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
