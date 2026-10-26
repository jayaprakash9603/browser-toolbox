import '@universal-form-autofill/sdk/style.css'
import { useCallback, useState } from 'react'
import {
  AutofillPanel,
  cssVariableTheme,
  useAutofillController,
  useStoreSnapshot,
} from '@universal-form-autofill/sdk/react'
import { createExtensionAutofillHost } from '@universal-form-autofill/sdk/extension'

import { ToolPage } from '@/shared/components/ToolPage'
import { cn } from '@/shared/utils/cn'
import { useProductivityTool } from '../_shared'
import { ConnectionBar } from './ConnectionBar'

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

function readDetailsOpen(): boolean {
  try {
    return localStorage.getItem(DETAILS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The SDK panel brings its own header card, which we replace with `ConnectionBar` (collapsible),
 * and a mode switch whose explanatory text is only shown while the details are open. Both give
 * the field list the room while collapsed.
 */
const PANEL_LAYOUT = [
  'ufa:min-h-0 ufa:flex-1',
  // ConnectionBar replaces the SDK page/profile card; !hidden beats the panel header's ufa:flex.
  '[&_header]:!hidden',
  // The mode switch moved into the connection bar's menu, so its row never takes space here.
  '[&_[data-slot=fill-bar]>div:first-child]:!hidden',
  // Tab panels scroll as a whole. Without this the cards inside shrink and clip their rows
  // instead of overflowing, so long lists (Answers, Profiles) could not be scrolled.
  '[&_[role=tabpanel]>*]:shrink-0!',
]

const COMPACT_FILL_BAR = [
  '[&_[data-slot=fill-bar]]:gap-2!',
  '[&_[data-slot=fill-bar]]:p-2.5!',
  // The "never fills passwords" note under the list.
  '[&_[data-slot=page-scroll]>p:last-child]:sr-only',
]

/** Suggest mode never fills, so its (now empty) action bar is dropped entirely. */
const SUGGEST_LAYOUT = ['[&_[data-slot=fill-bar]]:!hidden']

export default function FormAutofillTool() {
  const tool = useProductivityTool('productivity.form-autofill')
  const controller = useAutofillController(host)
  const snapshot = useStoreSnapshot(controller?.store)
  const suggestOnly = (snapshot.settings?.mode ?? 'suggest') === 'suggest'
  const [detailsOpen, setDetailsOpen] = useState(readDetailsOpen)

  const changeDetails = useCallback((open: boolean) => {
    setDetailsOpen(open)
    try {
      localStorage.setItem(DETAILS_KEY, open ? '1' : '0')
    } catch {
      /* preference only */
    }
  }, [])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden p-0">
      <ConnectionBar controller={controller} theme={theme} open={detailsOpen} onOpenChange={changeDetails} />
      {controller && (
        <AutofillPanel
          controller={controller}
          theme={theme}
          embedded
          className={cn(PANEL_LAYOUT, !detailsOpen && COMPACT_FILL_BAR, suggestOnly && SUGGEST_LAYOUT)}
        />
      )}
    </ToolPage>
  )
}
