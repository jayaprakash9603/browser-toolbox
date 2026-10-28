import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, KeyboardIcon, TimerIcon } from 'lucide-react'

import { useRouter } from '@/app/router'
import { useShortcutDisplay } from '@/features/shortcuts/useShortcutDisplay'
import { isCaptureViewerSearch } from '@/core/screenshot/viewerUrl'
import {
  DEFAULT_SCREENSHOT_SETTINGS,
  loadScreenshotSettings,
  saveScreenshotSettings,
  type ScreenshotSettings,
} from '@/core/screenshot/settings'
import { CaptureEditorApp } from '@/features/captureEditor/CaptureEditorApp'
import { ToolPage } from '@/shared/components/ToolPage'
import { useToast } from '@/shared/components/toast/useToast'
import { PanelSection } from '@/shared/components/toolkit'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { useCaptureTool } from '../_shared'
import { ModeGrid } from './ModeGrid'
import { QuickOptions } from './QuickOptions'
import { RecentCaptures } from './RecentCaptures'
import { RunStatus } from './RunStatus'
import { TargetHero } from './TargetHero'
import { UrlBatch } from './UrlBatch'
import { useCaptureRun, type RunMode } from './useCaptureRun'
import { useCaptureTarget } from './useCaptureTarget'

function CaptureLauncher() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { show } = useToast()
  const tool = useCaptureTool('screenshots.capture')
  useFocusTarget()
  const shortcutPrimary = useShortcutDisplay('capture-screenshot')
  const blockedId = useId()
  const target = useCaptureTarget()
  const [settings, setSettings] = useState<ScreenshotSettings>(DEFAULT_SCREENSHOT_SETTINGS)
  const { run, shots, start, cancel } = useCaptureRun(settings.captureDelaySec)
  const busy = run.phase !== 'idle'
  const blocked = !target.target || target.target.restricted

  useEffect(() => {
    void loadScreenshotSettings().then(setSettings)
  }, [])

  useEffect(() => {
    if (run.phase !== 'countdown') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run.phase, cancel])

  const patch = (next: Partial<ScreenshotSettings>) => {
    setSettings((current) => ({ ...current, ...next }))
    void saveScreenshotSettings(next)
  }

  const launch = (mode: RunMode, urls?: string[]) => {
    void start(mode, urls).then((ok) => {
      if (!ok && mode === 'menu') show(t('capture.run.menuFailed'), { variant: 'error' })
    })
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3 @container">
        <TargetHero state={target} run={run} shots={shots} blockedId={blockedId} />

        <PanelSection
          title={t('capture.launcher.title')}
          icon={<CameraIcon />}
          actions={
            settings.captureDelaySec > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <TimerIcon className="size-3" aria-hidden />
                {t('capture.launcher.delayBadge', { count: settings.captureDelaySec })}
              </span>
            )
          }
        >
          <p className="-mt-1 text-xs text-muted-foreground">{t(`capture.launcher.after.${settings.afterCapture}`)}</p>
          <ModeGrid
            run={run}
            blocked={blocked}
            describedBy={blockedId}
            windowTabs={target.windowUrls.length}
            onStart={(mode) => launch(mode)}
          />
        </PanelSection>

        <QuickOptions settings={settings} onChange={patch} />

        <UrlBatch
          windowUrls={target.windowUrls}
          waitMs={settings.batchUrlDelayMs}
          busy={busy}
          onCapture={(urls) => launch('batch-urls', urls)}
        />

        <RecentCaptures />

        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pb-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <KeyboardIcon className="size-3.5" aria-hidden />
            {t('capture.launcher.primaryShortcut', { shortcut: shortcutPrimary })}
          </span>
          <button
            type="button"
            className="cursor-pointer rounded-sm underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => navigate('/settings/keyboard-shortcuts')}
          >
            {t('capture.launcher.customizeShortcuts')}
          </button>
        </footer>

        <RunStatus run={run} onCancel={cancel} />
      </div>
    </ToolPage>
  )
}

export default function CaptureTool() {
  const { search } = useRouter()
  if (isCaptureViewerSearch(search)) {
    return <CaptureEditorApp search={search} />
  }
  return <CaptureLauncher />
}
