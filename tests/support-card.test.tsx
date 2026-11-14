import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as demoVisibility from '@/app/pages/home/useDemoCycle'
import { RouterProvider } from '@/app/router'
import {
  CHROME_STORE_LISTING_URL,
  EDGE_STORE_LISTING_URL,
  FEEDBACK_SUBJECT,
  FIREFOX_STORE_LISTING_URL,
  buildMailtoUrl,
} from '@/core/support/config'
import { SupportCard } from '@/features/support/SupportCard'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderSupport() {
  window.location.hash = '#/tools/text/diff?mode=split'
  return render(
    <RouterProvider>
      <SupportCard delay={0} />
    </RouterProvider>,
  )
}

describe('feedback action cards', () => {
  it('keeps all three destinations and exposes distinct names and descriptions', () => {
    renderSupport()
    const region = screen.getByRole('region', { name: 'Help and feedback' })
    expect(within(region).getAllByRole('link')).toHaveLength(3)

    const report = within(region).getByRole('link', { name: 'Report an Issue' })
    expect(report).toHaveAttribute(
      'href',
      '#/report-issue?from=%2Ftools%2Ftext%2Fdiff%3Fmode%3Dsplit',
    )
    expect(report).toHaveAccessibleDescription('Found a bug? Help us make it better.')

    const email = within(region).getByRole('link', { name: 'Email Us' })
    expect(email).toHaveAttribute('href', buildMailtoUrl(FEEDBACK_SUBJECT))
    expect(email).toHaveAccessibleDescription('Ideas or questions? Open an email draft.')

    const rate = within(region).getByRole('link', { name: 'Rate One Panel' })
    expect(rate).toHaveAttribute('href', CHROME_STORE_LISTING_URL)
    expect(rate).toHaveAttribute('target', '_blank')
    expect(rate).toHaveAttribute('rel', 'noopener noreferrer')
    expect(rate).toHaveAccessibleDescription('Enjoying One Panel? Review it in the store.')
  })

  it('opens the Edge add-ons listing when the panel is running in Microsoft Edge', () => {
    const userAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    })
    try {
      renderSupport()
      expect(screen.getByRole('link', { name: 'Rate One Panel' })).toHaveAttribute(
        'href',
        EDGE_STORE_LISTING_URL,
      )
    } finally {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
    }
  })

  it('opens the Firefox Add-ons listing when the panel is running in Firefox', () => {
    const userAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    })
    try {
      renderSupport()
      expect(screen.getByRole('link', { name: 'Rate One Panel' })).toHaveAttribute(
        'href',
        FIREFOX_STORE_LISTING_URL,
      )
    } finally {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
    }
  })

  it('keeps illustrations decorative and keyboard focus on the three actions only', async () => {
    const user = userEvent.setup()
    const { container } = renderSupport()
    const demos = container.querySelectorAll('.support-action-demo')
    expect(demos).toHaveLength(3)
    demos.forEach((demo) => expect(demo).toHaveAttribute('aria-hidden', 'true'))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    for (const name of ['Report an Issue', 'Email Us', 'Rate One Panel']) {
      await user.tab()
      expect(screen.getByRole('link', { name })).toHaveFocus()
    }
  })

  it('uses unique accessible labels when multiple card sections are rendered', () => {
    render(
      <>
        <SupportCard delay={0} />
        <SupportCard delay={0} />
      </>,
    )
    const reports = screen.getAllByRole('link', { name: 'Report an Issue' })
    expect(reports[0].getAttribute('aria-labelledby')).not.toBe(
      reports[1].getAttribute('aria-labelledby'),
    )
  })

  it('only plays the compact demos while onscreen and the page is visible', () => {
    const inViewport = vi.spyOn(demoVisibility, 'useInViewport').mockReturnValue(false)
    const pageVisible = vi.spyOn(demoVisibility, 'usePageVisible').mockReturnValue(true)
    const { rerender } = render(<SupportCard delay={0} />)
    const region = screen.getByRole('region', { name: 'Help and feedback' })
    expect(region).toHaveAttribute('data-motion', 'off')

    inViewport.mockReturnValue(true)
    rerender(<SupportCard delay={0} />)
    expect(region).toHaveAttribute('data-motion', 'active')

    pageVisible.mockReturnValue(false)
    rerender(<SupportCard delay={0} />)
    expect(region).toHaveAttribute('data-motion', 'off')
  })
})
