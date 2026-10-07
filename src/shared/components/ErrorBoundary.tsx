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
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">{t('errors.toolFailed')}</p>
      <p className="text-xs text-muted-foreground">{toUserMessage(error, t('errors.generic'))}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {t('common.tryAgain')}
      </Button>
    </div>
  )
}
