import '@universal-form-autofill/sdk/style.css'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkIcon, InboxIcon, ScanTextIcon } from 'lucide-react'
import {
  AutofillPanel,
  cssVariableTheme,
  useAutofillState,
} from '@universal-form-autofill/sdk/react'
import { createExtensionAutofillHost } from '@universal-form-autofill/sdk/extension'

import { memoryTotals } from '@/core/form-memory/model'
import { useFormMemory } from '@/features/form-memory/useFormMemory'
import { useShortcutDisplay } from '@/features/shortcuts/useShortcutDisplay'
import { ToolPage } from '@/shared/components/ToolPage'
import { useToast } from '@/shared/components/toast/useToast'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { useProductivityTool } from '../_shared'
import { ConnectionBar } from './ConnectionBar'
import { FillBar, type FillBarAction } from './FillBar'
import { ReviewView } from './ReviewView'
import { SavedView } from './SavedView'
import { useFormPage } from './useFormPage'
import { useReviewAutofillController } from './useReviewAutofillController'

const host = createExtensionAutofillHost({
  chrome,
  contentScriptFile: 'form-autofill/content-script.js',
  storageNamespace: 'browser_toolbox_autofill',
})

/** Toolbox colors and font on the default rem spacing, so controls match the rest of the toolbox. */
const theme = cssVariableTheme({
  mapping: {
    destructiveForeground: '--destructive-foreground',
  },
})

const DETAILS_KEY = 'tbx.autofill.details'
const VIEW_KEY = 'tbx.autofill.view'

type View = 'page' | 'review' | 'saved'

const VIEWS: readonly View[] = ['page', 'review', 'saved']

function readView(): View {
  const stored = readPreference(VIEW_KEY)
  return VIEWS.find((view) => view === stored) ?? 'page'
}

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* preference only */
  }
}

/**
 * The SDK panel brings its own header card (replaced by `ConnectionBar`), a mode switch and fill
 * bar (replaced by the single `FillBar` action) and a "learn from this page" card (learning is
 * always on and lives in Settings). Only its field list and tabs stay.
 */
const PANEL_LAYOUT = [
  'ufa:min-h-0 ufa:flex-1',
  // !hidden beats the panel header's ufa:flex.
  '[&_header]:!hidden',
  '[&_[data-slot=fill-bar]]:!hidden',
  '[&_[data-slot=learning-bar]]:!hidden',
  // The single button fills every matched field, so per-field selection boxes would do nothing.
  '[&_[data-slot=field-list]_[data-slot=checkbox]]:!hidden',
  // The "never fills passwords" note under the list.
  '[&_[data-slot=page-scroll]>p:last-child]:sr-only',
  // Tab panels scroll as a whole. Without this the cards inside shrink and clip their rows
  // instead of overflowing, so long lists (Answers, Profiles) could not be scrolled.
  '[&_[role=tabpanel]>*]:shrink-0!',
]

export default function FormAutofillTool() {
  const { t } = useTranslation()
  const { show } = useToast()
  const tool = useProductivityTool('productivity.form-autofill')
  const [pageScanEnabled, setPageScanEnabled] = useState(false)
  const controller = useReviewAutofillController(host, pageScanEnabled)
  const sdk = useAutofillState(controller)
  const memory = useFormMemory()
  const [detailsOpen, setDetailsOpen] = useState(() => readPreference(DETAILS_KEY) === '1')
  const [view, setView] = useState<View>(readView)
  const [busy, setBusy] = useState<FillBarAction | 'access' | 'save' | null>(null)
  const { info: pageInfo, refresh: refreshPage, run: runPage } = useFormPage(
    view === 'page',
    pageScanEnabled,
    sdk.page?.url,
  )
  const fillKey = useShortcutDisplay('form-fill')
  const clearKey = useShortcutDisplay('form-clear')

  const profileIds = useMemo(
    () =>
      sdk.fields
        .filter((field) => {
          const action = sdk.decisions[field.id]?.action
          return action === 'fill' || action === 'confirm'
        })
        .map((field) => field.id),
    [sdk.fields, sdk.decisions],
  )

  const changeDetails = useCallback((open: boolean) => {
    setDetailsOpen(open)
    writePreference(DETAILS_KEY, open ? '1' : '0')
  }, [])

  const changeView = useCallback((next: View) => {
    setView(next)
    writePreference(VIEW_KEY, next)
  }, [])

  const requestPageScan = useCallback(() => {
    setPageScanEnabled(true)
  }, [])

  const act = useCallback(
    async (action: FillBarAction) => {
      setPageScanEnabled(true)
      setBusy(action)
      try {
        if (action === 'fill') {
          let profileFilled = 0
          if (controller && profileIds.length > 0) {
            const results = await controller.fill({ fieldIds: profileIds }).catch(() => [])
            profileFilled = results.filter((result) => result.status === 'filled').length
          }
          const result = await runPage('fill')
          const filled = profileFilled + (result?.filled ?? 0)
          show(filled > 0 ? t('formMemory.toast.filled', { count: filled }) : t('formMemory.toast.nothing'), {
            variant: filled > 0 ? 'success' : 'info',
          })
        } else {
          const result = await runPage('clear')
          const cleared = result?.cleared ?? 0
          show(cleared > 0 ? t('formMemory.toast.cleared', { count: cleared }) : t('formMemory.toast.nothingToClear'), {
            variant: cleared > 0 ? 'success' : 'info',
          })
          if (controller) void controller.scan().catch(() => undefined)
        }
      } finally {
        setBusy(null)
      }
    },
    [controller, profileIds, runPage, show, t],
  )

  const allowAccess = useCallback(async () => {
    const url = pageInfo?.url
    if (!url) return
    setBusy('access')
    try {
      const granted = await chrome.permissions
        .request({ origins: [`${new URL(url).origin}/*`] })
        .catch(() => false)
      if (granted) {
        setPageScanEnabled(true)
        await refreshPage()
        if (controller) void controller.connect()
      }
    } finally {
      setBusy(null)
    }
  }, [controller, pageInfo?.url, refreshPage])

  const saveCurrent = useCallback(async () => {
    setBusy('save')
    try {
      const result = await runPage('save')
      if (result?.ok) show(t('formMemory.toast.saved', { count: result.saved }))
      else show(t('formMemory.toast.saveFailed'), { variant: 'error' })
    } finally {
      setBusy(null)
    }
  }, [runPage, show, t])

  const savedCount = memory.state ? memoryTotals(memory.state).pages : 0
  const reviewCount = memory.state ? Object.keys(memory.state.review).length : 0
  const canSave = Boolean(pageInfo?.ok) && pageInfo?.reason !== 'blocked'

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden p-0">
      <ConnectionBar
        controller={controller}
        theme={theme}
        open={detailsOpen}
        onOpenChange={changeDetails}
        scanEnabled={pageScanEnabled}
        onRequestScan={requestPageScan}
      />
      <div className="shrink-0 px-3 pb-2">
        <Segmented
          value={view}
          onValueChange={changeView}
          ariaLabel={t('formMemory.view.label')}
          size="sm"
          className="flex w-full [&>button]:flex-1"
          options={[
            {
              value: 'page',
              label: (
                <>
                  <ScanTextIcon aria-hidden />
                  {t('formMemory.view.page')}
                </>
              ),
            },
            {
              value: 'review',
              label: (
                <>
                  <InboxIcon aria-hidden />
                  {t('formMemory.view.review')}
                  {reviewCount > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] leading-4 font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      {reviewCount}
                    </span>
                  )}
                </>
              ),
            },
            {
              value: 'saved',
              label: (
                <>
                  <BookmarkIcon aria-hidden />
                  {t('formMemory.view.saved')}
                  {savedCount > 0 && (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] leading-4 font-semibold tabular-nums text-muted-foreground">
                      {savedCount}
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />
      </div>
      {view === 'page' ? (
        <>
          {controller && (
            <AutofillPanel controller={controller} theme={theme} embedded className={cn(PANEL_LAYOUT)} />
          )}
          <FillBar
            info={pageInfo}
            profileCount={profileIds.length}
            busy={busy === 'save' ? null : busy}
            shortcut={{ fill: fillKey, clear: clearKey }}
            onAction={(action) => void act(action)}
            onAllowAccess={() => void allowAccess()}
            onOpenReview={() => changeView('review')}
          />
        </>
      ) : view === 'review' ? (
        <ReviewView state={memory.state} update={memory.update} currentUrl={pageInfo?.url} />
      ) : (
        <SavedView
          state={memory.state}
          update={memory.update}
          currentUrl={pageInfo?.url}
          canSave={canSave}
          saving={busy === 'save'}
          onSave={() => void saveCurrent()}
        />
      )}
    </ToolPage>
  )
}
