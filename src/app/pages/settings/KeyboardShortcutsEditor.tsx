import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlobeIcon, PanelLeftIcon } from 'lucide-react'

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

interface KeyboardShortcutsEditorProps {
  showHeader?: boolean
}

export function KeyboardShortcutsEditor({ showHeader = true }: KeyboardShortcutsEditorProps) {
  const { t } = useTranslation()
  const { state, patch } = useKeyboardShortcutSettings()
  const [conflictId, setConflictId] = useState<string | null>(null)
  if (!state) return null

  const renderGroup = (
    title: string,
    description: string,
    icon: typeof PanelLeftIcon,
    commandIds: string[],
  ) => {
    const Icon = icon
    return (
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-start gap-3 border-b bg-muted/30 px-4 py-3">
          <div className="mt-0.5 rounded-md border bg-background p-1.5 text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ul className="divide-y">
          {commandIds.map((id) => {
            const command = getToolboxCommand(id)
            if (!command) return null
            const effective = getEffectiveBinding(id, state)
            const defaultLabel = formatAcceleratorDisplay(defaultBindingForCommand(command))
            return (
              <li
                key={id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-search-id={`shortcut-${id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(command.titleKey)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('shortcuts.defaultLabel', { shortcut: defaultLabel })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
                  <p className="text-[11px] text-destructive sm:basis-full">{t('shortcuts.conflict')}</p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {showHeader && (
        <header data-search-id="keyboardShortcuts">
          <h1 className="text-sm font-semibold">{t('shortcuts.settingsTitle')}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t('shortcuts.settingsDescription')}</p>
        </header>
      )}
      {renderGroup(
        t('shortcuts.panelGroup'),
        t('shortcuts.panelGroupHint'),
        PanelLeftIcon,
        PANEL_TOOLBOX_COMMANDS.map((c) => c.id),
      )}
      {renderGroup(
        t('shortcuts.globalGroup'),
        t('shortcuts.globalGroupHint'),
        GlobeIcon,
        GLOBAL_TOOLBOX_COMMANDS.map((c) => c.id),
      )}
      <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        {t('shortcuts.hint', { count: TOOLBOX_COMMANDS.length })}
      </p>
    </div>
  )
}
