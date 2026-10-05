import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  AppLoadingSkeleton,
  type AppLoadingSkeletonVariant,
} from '@/shared/components/AppLoadingSkeleton'

const variants: AppLoadingSkeletonVariant[] = [
  'home',
  'collection',
  'category',
  'settings',
  'tool',
]

describe('application loading skeleton', () => {
  it.each(variants)('exposes an accessible loading status for the %s layout', (variant) => {
    render(<AppLoadingSkeleton variant={variant} label="Loading" />)

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the home tool grid shape', () => {
    const { container } = render(<AppLoadingSkeleton variant="home" label="Loading" />)

    expect(container.querySelectorAll('[data-skeleton-grid]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-skeleton-grid] > div')).toHaveLength(6)
  })
})