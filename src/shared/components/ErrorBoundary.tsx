import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { toUserMessage } from '@/core/errors'
import { Button } from '@/shared/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tool render failed', {
      error,
      componentStack: info.componentStack,
      route: window.location.hash,
    })
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />
      )
    }
    return this.props.children
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation()
  const detail = error instanceof Error && error.message ? error.message : null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">{t('errors.toolFailed')}</p>
      <p className="text-xs text-muted-foreground">{toUserMessage(error, t('errors.generic'))}</p>
      {detail && (
        <pre className="max-w-md overflow-auto rounded border bg-muted/40 p-2 text-left font-mono text-[11px] text-muted-foreground">
          {detail}
        </pre>
      )}
      <Button size="sm" variant="outline" onClick={onRetry}>
        {t('common.tryAgain')}
      </Button>
    </div>
  )
}
