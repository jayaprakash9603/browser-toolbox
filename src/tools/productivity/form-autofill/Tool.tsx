import '@universal-form-autofill/sdk/style.css'
import { useCallback, useState } from 'react'
import { AutofillPanel, cssVariableTheme, useAutofillController } from '@universal-form-autofill/sdk/react'
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
]

const COMPACT_FILL_BAR = [
  // Mode hint stays in the DOM for assistive tech (aria-describedby) but leaves the layout.
  '[&_[data-slot=fill-bar]>div:first-child>p]:sr-only',
  '[&_[data-slot=fill-bar]]:gap-2!',
  '[&_[data-slot=fill-bar]]:p-2.5!',
  // The "never fills passwords" note under the list.
  '[&_[data-slot=page-scroll]>p:last-child]:sr-only',
]

export default function FormAutofillTool() {
  const tool = useProductivityTool('productivity.form-autofill')
  const controller = useAutofillController(host)
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
          className={cn(PANEL_LAYOUT, !detailsOpen && COMPACT_FILL_BAR)}
        />
      )}
    </ToolPage>
  )
}
