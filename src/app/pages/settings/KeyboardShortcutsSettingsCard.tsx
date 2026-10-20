import { Link } from '@/app/router'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, KeyboardIcon } from 'lucide-react'

import { formatAcceleratorDisplay, getEffectiveBinding, getToolboxCommand } from '@/core/commands'
import { useKeyboardShortcutSettings } from '@/features/shortcuts/useKeyboardShortcutSettings'

const PREVIEW_COMMAND_IDS = ['panel-search', 'toggle-pip', 'open-command-palette'] as const

export function KeyboardShortcutsSettingsCard() {
  const { t } = useTranslation()
  const { state } = useKeyboardShortcutSettings()
  if (!state) return null

  return (
    <>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('settings.keyboardShortcutsSection')}
      </h2>
      <Link
        to="/settings/keyboard-shortcuts"
        className="group mb-4 block rounded-xl border bg-card outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
        data-search-id="keyboardShortcuts"
      >
        <div className="flex items-center gap-3 p-3.5">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary"
            aria-hidden
          >
            <KeyboardIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{t('shortcuts.settingsTitle')}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {t('settings.keyboardShortcutsCardDescription')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PREVIEW_COMMAND_IDS.map((id) => {
                const command = getToolboxCommand(id)
                const binding = getEffectiveBinding(id, state)
                if (!command || !binding) return null
                const label = t(command.titleKey)
                return (
                  <span
                    key={id}
                    className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <span className="truncate">{label}</span>
                    <kbd className="shrink-0 font-mono text-[10px] font-medium text-foreground">
                      {formatAcceleratorDisplay(binding)}
                    </kbd>
                  </span>
                )
              })}
            </div>
          </div>
          <ChevronRightIcon
            className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </Link>
    </>
  )
}
