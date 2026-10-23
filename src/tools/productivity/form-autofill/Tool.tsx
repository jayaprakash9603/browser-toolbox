import '@universal-form-autofill/sdk/style.css'
import { AutofillPanel, cssVariableTheme } from '@universal-form-autofill/sdk/react'
import { createExtensionAutofillHost } from '@universal-form-autofill/sdk/extension'

import { ToolPage } from '@/shared/components/ToolPage'
import { cn } from '@/shared/utils/cn'
import { useProductivityTool } from '../_shared'

const host = createExtensionAutofillHost({
  chrome,
  contentScriptFile: 'form-autofill/content-script.js',
  storageNamespace: 'browser_toolbox_autofill',
})

/** Follow toolbox tokens, density, and light/dark on `html.dark`. */
const theme = cssVariableTheme({
  density: 'compact',
  mapping: {
    destructiveForeground: '--destructive-foreground',
  },
})

export default function FormAutofillTool() {
  const tool = useProductivityTool('productivity.form-autofill')
  return (
    <ToolPage
      tool={tool}
      contentClassName="flex min-h-0 flex-col overflow-hidden p-0 @[360px]:px-4 @[360px]:pb-[var(--density-page-pad)]"
    >
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          'rounded-lg border border-border bg-card shadow-xs',
        )}
      >
        <AutofillPanel host={host} theme={theme} embedded className="ufa:min-h-0 ufa:flex-1" />
      </div>
    </ToolPage>
  )
}
