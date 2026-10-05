import { AppShell } from '@/app/layouts/AppShell'
import { ThemeApplicator } from '@/app/providers/ThemeApplicator'
import { RouterProvider } from '@/app/router'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <RouterProvider>
          <ThemeApplicator />
          <AppShell />
        </RouterProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
