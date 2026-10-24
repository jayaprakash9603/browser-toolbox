import '@universal-form-autofill/sdk/style.css'
import { AutofillPanel, cssVariableTheme } from '@universal-form-autofill/sdk/react'
import { createExtensionAutofillHost } from '@universal-form-autofill/sdk/extension'

import { ToolPage } from '@/shared/components/ToolPage'
import { useProductivityTool } from '../_shared'

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

export default function FormAutofillTool() {
  const tool = useProductivityTool('productivity.form-autofill')
  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden p-0">
      <AutofillPanel host={host} theme={theme} embedded className="ufa:min-h-0 ufa:flex-1" />
    </ToolPage>
  )
}
