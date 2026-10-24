import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { REACT_DEVTOOLS_SESSION_DETECTION_KEY, REACT_DEVTOOLS_SURFACE_KEYS } from '@/core/reactDevtools/constants'
import type { ReactDevtoolsSurfaceKey } from '@/core/reactDevtools/constants'
import { useReactDevtoolsSettings } from '@/features/developer/useReactDevtoolsSettings'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { useDevTool } from '../_shared'

export default function ReactDevtoolsTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.react-devtools')
  const { state, patch } = useReactDevtoolsSettings()
  const [detected, setDetected] = useState<string | null>(null)
  const [revision, setRevision] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/react-devtools/REVISION.json')
        if (res.ok) {
          const data = (await res.json()) as { sha?: string; devtoolsVersion?: string }
          setRevision(data.devtoolsVersion ? `${data.devtoolsVersion} (${data.sha?.slice(0, 7)})` : data.sha ?? null)
        }
      } catch {
        /* not vendored yet */
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tabId = tabs[0]?.id
      if (tabId == null) return
      const bag = await chrome.storage.session.get(REACT_DEVTOOLS_SESSION_DETECTION_KEY)
      const map = bag[REACT_DEVTOOLS_SESSION_DETECTION_KEY] as Record<string, string> | undefined
      setDetected(map?.[String(tabId)] ?? null)
    })()
  }, [state?.enabled])

  const toggleSurface = (key: ReactDevtoolsSurfaceKey, on: boolean) => {
    if (!state) return
    void patch({ surfaces: { ...state.surfaces, [key]: on } })
  }

  return (
    <ToolPage tool={tool}>
      {!state ? null : (
        <div className="space-y-4 rounded-lg border bg-card p-[var(--density-card-pad)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="rdt-enabled">{t('reactDevtools.enabled')}</Label>
              <p className="text-tool-desc">{t('reactDevtools.enabledHint')}</p>
            </div>
            <Switch
              id="rdt-enabled"
              checked={state.enabled}
              onCheckedChange={(on) => void patch({ enabled: on })}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t('reactDevtools.surfacesTitle')}</p>
            <ul className="space-y-2">
              {REACT_DEVTOOLS_SURFACE_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{t(`reactDevtools.surface.${key}`)}</span>
                  <Switch
                    checked={state.surfaces[key]}
                    disabled={!state.enabled}
                    onCheckedChange={(on) => toggleSurface(key, on)}
                    aria-label={t(`reactDevtools.surface.${key}`)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">{t('reactDevtools.openHint')}</p>

          <div className="text-xs text-muted-foreground">
            <p>
              {t('reactDevtools.detection')}:{' '}
              {detected ? t('reactDevtools.detectionYes') : t('reactDevtools.detectionNo')}
              {detected ? ` (${detected})` : ''}
            </p>
            {revision && <p>{t('reactDevtools.revision')}: {revision}</p>}
            <p className="mt-2">{t('reactDevtools.license')}</p>
          </div>
        </div>
      )}
    </ToolPage>
  )
}
