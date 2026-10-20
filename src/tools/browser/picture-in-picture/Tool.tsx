import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import type { PipToggleResult } from '@/core/pip'
import { usePipSettings } from '@/features/browser/usePipSettings'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'

import { useBrowserTool } from '../_shared'

export default function PictureInPictureTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.picture-in-picture')
  const { state, patch } = usePipSettings()
  const [shortcut, setShortcut] = useState('Alt+P')
  const [lastResult, setLastResult] = useState<PipToggleResult | null>(null)

  useEffect(() => {
    void chrome.commands.getAll().then((commands) => {
      const pip = commands.find((c) => c.name === 'toggle-pip')
      if (pip?.shortcut) setShortcut(pip.shortcut)
    })
  }, [])

  const toggleOnTab = useCallback(async () => {
    const result = await sendMessage<PipToggleResult>({ type: 'PIP_TOGGLE' })
    if (result) setLastResult(result)
  }, [])

  if (!state) return null

  return (
    <ToolPage
      tool={tool}
      actions={
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('pip.enabled')}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium">{t('pip.howToTitle')}</h2>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>{t('pip.howTo1', { shortcut })}</li>
            <li>{t('pip.howTo2')}</li>
            <li>{t('pip.howTo3')}</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            <a
              href="chrome://extensions/shortcuts"
              className="text-primary underline-offset-2 hover:underline"
              onClick={(e) => {
                e.preventDefault()
                void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
              }}
            >
              {t('pip.shortcutsLink')}
            </a>
          </p>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <Button
            className="w-full"
            disabled={!state.enabled}
            onClick={() => void toggleOnTab()}
          >
            {t('pip.toggleButton')}
          </Button>
          {lastResult?.gestureRequired && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">{t('pip.gestureHint', { shortcut })}</p>
          )}
          {lastResult?.action === 'entered' && (
            <p className="mt-2 text-xs text-muted-foreground">{t('pip.entered')}</p>
          )}
          {lastResult?.action === 'exited' && (
            <p className="mt-2 text-xs text-muted-foreground">{t('pip.exited')}</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t('pip.autoPip')}</p>
              <p className="text-xs text-muted-foreground">{t('pip.autoPipHint')}</p>
            </div>
            <Switch
              checked={state.autoPip}
              disabled={!state.enabled}
              onCheckedChange={(on) => void patch({ autoPip: on })}
              aria-label={t('pip.autoPip')}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t('pip.showContextMenu')}</p>
              <p className="text-xs text-muted-foreground">{t('pip.showContextMenuHint')}</p>
            </div>
            <Switch
              checked={state.showContextMenu}
              disabled={!state.enabled}
              onCheckedChange={(on) => void patch({ showContextMenu: on })}
              aria-label={t('pip.showContextMenu')}
            />
          </div>
        </section>

        <p className="text-xs text-muted-foreground">{t('pip.limits')}</p>
      </div>
    </ToolPage>
  )
}
