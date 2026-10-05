import { useEffect, useState } from 'react'

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
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [confirm, setConfirm] = useState<'clipboard' | 'recent' | 'reset' | null>(null)

  useEffect(() => {
    void initStorage().then(() => getSettings().then(setSettings))
  }, [])

  if (!settings) return null

  const update = async (patch: Partial<Settings>) => {
    setSettings(await updateSettings(patch))
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3"><BackButton /></div>
      <h1 className="mb-1 text-sm font-semibold">Settings</h1>
      <p className="mb-4 text-xs text-muted-foreground">Preferences are stored locally in Chrome.</p>

      <SettingRow label="Theme" description="Light, dark or follow system.">
        <Tabs
          value={settings.theme}
          onValueChange={(value) => void update({ theme: value as ThemeMode })}
        >
          <TabsList>
            <TabsTrigger value="light">Light</TabsTrigger>
            <TabsTrigger value="dark">Dark</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </Tabs>
      </SettingRow>

      <SettingRow label="Density" description="Control spacing in the panel.">
        <Tabs
          value={settings.density}
          onValueChange={(value) => void update({ density: value as Density })}
        >
          <TabsList>
            <TabsTrigger value="compact">Compact</TabsTrigger>
            <TabsTrigger value="comfortable">Comfortable</TabsTrigger>
          </TabsList>
        </Tabs>
      </SettingRow>

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Clipboard
      </h2>
      <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
        Clipboard history can contain sensitive information. All data stays on this device and is
        never sent anywhere.
      </p>

      <SettingRow label="Clipboard history" description="Record text copied while the panel is open.">
        <Switch
          checked={settings.clipboardHistoryEnabled}
          onCheckedChange={(checked) => void update({ clipboardHistoryEnabled: checked })}
          aria-label="Enable clipboard history"
        />
      </SettingRow>

      <SettingRow label="History size" description="Maximum stored entries (pinned items are kept).">
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
          aria-label="Clipboard history size"
        />
      </SettingRow>

      <Separator className="my-4" />
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Data
      </h2>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={() => setConfirm('clipboard')}>
          Clear clipboard history
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirm('recent')}>
          Clear recent tools
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setConfirm('reset')}>
          Reset all extension data
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === 'clipboard'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Clear clipboard history?"
        description="This permanently deletes all stored clipboard entries, including pinned ones."
        confirmLabel="Clear history"
        destructive
        onConfirm={() => void clearHistory(true)}
      />
      <ConfirmDialog
        open={confirm === 'recent'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Clear recent tools?"
        description="Your recently used tools list will be emptied."
        confirmLabel="Clear"
        destructive
        onConfirm={() => void clearRecentTools()}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reset everything?"
        description="Settings, favorites, recents and clipboard history will all be deleted."
        confirmLabel="Reset"
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
