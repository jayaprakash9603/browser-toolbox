import { AppShell } from '@/app/layouts/AppShell'
import { ThemeApplicator } from '@/app/providers/ThemeApplicator'
import { RouterProvider } from '@/app/router'
import i18n, { DocumentLanguage } from '@/i18n'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { I18nextProvider } from 'react-i18next'

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <I18nextProvider i18n={i18n}>
          <RouterProvider>
            <DocumentLanguage />
            <ThemeApplicator />
            <AppShell />
          </RouterProvider>
        </I18nextProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
