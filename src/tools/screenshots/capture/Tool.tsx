import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CameraIcon,
  FrameIcon,
  HistoryIcon,
  LayersIcon,
  ListIcon,
  MousePointerClickIcon,
  UnfoldVerticalIcon,
} from 'lucide-react'

import { useRouter } from '@/app/router'
import { getToolboxCommand } from '@/core/commands'
import { captureViewerUrl, isCaptureViewerSearch } from '@/core/screenshot/viewerUrl'
import { CaptureEditorApp } from '@/features/captureEditor/CaptureEditorApp'
import { sendMessage } from '@/core/messaging/messageService'
import type { ScreenshotMode } from '@/core/screenshot/types'
import { listScreenshotHistory, type ScreenshotHistoryEntry } from '@/core/screenshot/history'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { useCaptureTool } from '../_shared'

const MODES: {
  mode: ScreenshotMode
  commandId: string
  icon: typeof CameraIcon
  labelKey: string
}[] = [
  { mode: 'entire', commandId: 'capture-entire', icon: UnfoldVerticalIcon, labelKey: 'capture.launcher.entire' },
  { mode: 'visible', commandId: 'capture-visible', icon: CameraIcon, labelKey: 'capture.launcher.visible' },
  { mode: 'selection', commandId: 'capture-selection', icon: FrameIcon, labelKey: 'capture.launcher.selection' },
  { mode: 'element', commandId: 'capture-element', icon: MousePointerClickIcon, labelKey: 'capture.launcher.element' },
  { mode: 'all-tabs', commandId: '', icon: LayersIcon, labelKey: 'capture.launcher.allTabs' },
]

function shortcutLabel(commandId: string): string {
  const def = getToolboxCommand(commandId)
  return def?.binding.default ?? ''
}

function CaptureLauncher() {
  const { t } = useTranslation()
  const tool = useCaptureTool('screenshots.capture')
  useFocusTarget()
  const [urls, setUrls] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<ScreenshotHistoryEntry[]>([])

  useEffect(() => {
    void listScreenshotHistory().then(setHistory)
  }, [])

  const start = async (mode: ScreenshotMode, batchUrls?: string[]) => {
    setBusy(true)
    try {
      await sendMessage({
        type: 'SCREENSHOT_START',
        mode,
        urls: batchUrls,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('capture.launcher.hint')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map(({ mode, commandId, icon: Icon, labelKey }) => (
            <Button
              key={mode}
              variant="outline"
              className="h-auto justify-start gap-2 py-3"
              disabled={busy}
              onClick={() => void start(mode)}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex flex-col items-start text-left">
                <span>{t(labelKey)}</span>
                {commandId && (
                  <span className="text-[10px] text-muted-foreground">{shortcutLabel(commandId)}</span>
                )}
              </span>
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-auto justify-start gap-2 py-3"
            disabled={busy}
            onClick={() => void sendMessage({ type: 'SCREENSHOT_MENU_OPEN' })}
          >
            <ListIcon className="size-4" />
            <span className="flex flex-col items-start text-left">
              <span>{t('capture.launcher.menu')}</span>
              <span className="text-[10px] text-muted-foreground">
                {shortcutLabel('capture-menu')}
              </span>
            </span>
          </Button>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('capture.launcher.urlBatch')}</label>
          <Textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={t('capture.launcher.urlBatchPlaceholder')}
            rows={4}
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            disabled={busy || !urls.trim()}
            onClick={() =>
              void start(
                'batch-urls',
                urls
                  .split(/\n/)
                  .map((u) => u.trim())
                  .filter(Boolean),
              )
            }
          >
            {t('capture.launcher.urlBatchRun')}
          </Button>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              <HistoryIcon className="mr-1 inline size-3.5" />
              {t('capture.launcher.history')}
            </h3>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                void chrome.tabs.create({ url: captureViewerUrl({ history: true }) })
              }}
            >
              {t('capture.launcher.historyOpen')}
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('capture.launcher.historyEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <img src={item.thumbnail} alt="" className="size-10 rounded border object-cover" />
                  <span className="flex-1 truncate">{item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('capture.launcher.primaryShortcut', {
            shortcut: shortcutLabel('capture-screenshot'),
          })}
        </p>
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
