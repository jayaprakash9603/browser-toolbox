import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

function Boom(): null {
  throw new Error('tool crash')
}

describe('ErrorBoundary', () => {
  it('shows an inline fallback without taking down siblings', () => {
    render(
      <div>
        <header data-testid="shell-header">Header</header>
        <ErrorBoundary resetKey="tool-a">
          <Boom />
        </ErrorBoundary>
      </div>,
    )
    expect(screen.getByTestId('shell-header')).toBeInTheDocument()
    expect(screen.getByText(/ran into a problem/i)).toBeInTheDocument()
  })

  it('clears the error when resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/ran into a problem/i)).toBeInTheDocument()

    function Ok() {
      return <p>Recovered</p>
    }
    rerender(
      <ErrorBoundary resetKey="b">
        <Ok />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})
