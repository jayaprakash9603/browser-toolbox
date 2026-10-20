import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  defaultBindingForCommand,
  formatAcceleratorDisplay,
  getEffectiveBinding,
  getToolboxCommand,
  GLOBAL_TOOLBOX_COMMANDS,
  listBindingConflicts,
  PANEL_TOOLBOX_COMMANDS,
  resetCommandBinding,
  setCommandBinding,
  TOOLBOX_COMMANDS,
} from '@/core/commands'
import { useKeyboardShortcutSettings } from '@/features/shortcuts/useKeyboardShortcutSettings'
import { ShortcutCapture } from '@/shared/components/ShortcutCapture'
import { Button } from '@/shared/components/ui/button'

export function KeyboardShortcutsSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useKeyboardShortcutSettings()
  const [conflictId, setConflictId] = useState<string | null>(null)
  if (!state) return null

  const renderGroup = (title: string, commandIds: string[]) => (
    <div className="mb-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-2">
        {commandIds.map((id) => {
          const command = getToolboxCommand(id)
          if (!command) return null
          const effective = getEffectiveBinding(id, state)
          const defaultLabel = formatAcceleratorDisplay(defaultBindingForCommand(command))
          return (
            <div
              key={id}
              className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              data-search-id={`shortcut-${id}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium">{t(command.titleKey)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t('shortcuts.defaultLabel', { shortcut: defaultLabel })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ShortcutCapture
                  value={effective}
                  disabled={false}
                  onChange={(binding) => {
                    if (binding && listBindingConflicts(id, binding, state).length) {
                      setConflictId(id)
                      return
                    }
                    setConflictId(null)
                    void setCommandBinding(id, binding).then((next) => patch({ bindings: next.bindings }))
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setConflictId(null)
                    void resetCommandBinding(id).then((next) => patch({ bindings: next.bindings }))
                  }}
                >
                  {t('shortcuts.reset')}
                </Button>
              </div>
              {conflictId === id && (
                <p className="text-[10px] text-destructive">{t('shortcuts.conflict')}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <h2 className="mb-1 text-xs font-semibold" data-search-id="keyboardShortcuts">
        {t('shortcuts.settingsTitle')}
      </h2>
      <p className="mb-3 text-[11px] text-muted-foreground">{t('shortcuts.settingsDescription')}</p>
      {renderGroup(t('shortcuts.panelGroup'), PANEL_TOOLBOX_COMMANDS.map((c) => c.id))}
      {renderGroup(t('shortcuts.globalGroup'), GLOBAL_TOOLBOX_COMMANDS.map((c) => c.id))}
      <p className="text-[10px] text-muted-foreground">
        {t('shortcuts.hint', { count: TOOLBOX_COMMANDS.length })}
      </p>
    </>
  )
}
