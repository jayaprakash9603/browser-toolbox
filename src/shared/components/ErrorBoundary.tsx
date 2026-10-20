import i18n from 'i18next'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Link } from '@/app/router'
import { toUserMessage } from '@/core/errors'
import { Button } from '@/shared/components/ui/button'

interface Props {
  children: ReactNode
  /** When this value changes, a prior error is cleared (e.g. navigating to another tool). */
  resetKey?: string
  fallback?: ReactNode
  showHomeLink?: boolean
}

interface State {
  error: Error | null
}

function t(key: string, fallback: string): string {
  return i18n.isInitialized ? i18n.t(key) : fallback
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
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
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorFallback
          error={this.state.error}
          showHomeLink={this.props.showHomeLink}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

function ErrorFallback({
  error,
  onRetry,
  showHomeLink,
}: {
  error: Error
  onRetry: () => void
  showHomeLink?: boolean
}) {
  const detail = error instanceof Error && error.message ? error.message : null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">{t('errors.toolFailed', 'This tool failed to load')}</p>
      <p className="text-xs text-muted-foreground">
        {toUserMessage(error, t('errors.generic', 'Something went wrong'))}
      </p>
      {detail && (
        <pre className="max-w-md overflow-auto rounded border bg-muted/40 p-2 text-left font-mono text-[11px] text-muted-foreground">
          {detail}
        </pre>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('common.tryAgain', 'Try again')}
        </Button>
        {showHomeLink && (
          <Button size="sm" variant="ghost" asChild>
            <Link to="/">{t('nav.home', 'Back to home')}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
