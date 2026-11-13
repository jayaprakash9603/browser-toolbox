import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import type { PageLink, PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import { sendMessage } from '@/core/messaging'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import RedirectTracerTool from '@/tools/web/redirect-tracer/Tool'

function link(partial: Partial<PageLink> & Pick<PageLink, 'index' | 'href' | 'kind' | 'text'>): PageLink {
  let host = ''
  try {
    host = new URL(partial.href).hostname.replace(/^www\./, '')
  } catch {
    // mailto: links have no host.
  }
  return {
    rawHref: partial.href,
    textSource: partial.text ? 'text' : 'none',
    host,
    section: 'main',
    rel: [],
    nofollow: false,
    newTab: false,
    download: false,
    insecure: false,
    visible: true,
    anchorMissing: false,
    hasImage: false,
    ...partial,
  }
}

const snapshot: PageLinksSnapshot = {
  url: 'https://example.com/page',
  title: 'Example page',
  host: 'example.com',
  truncated: false,
  links: [
    link({ index: 0, href: 'https://example.com/about', kind: 'internal', text: 'About' }),
    link({ index: 1, href: 'https://short.test/go', kind: 'external', text: 'Campaign' }),
    link({ index: 2, href: 'mailto:hi@example.com', kind: 'email', text: 'Email' }),
  ],
}

vi.mock('@/tools/web/tabMessaging', () => ({
  sendToActiveTab: vi.fn(async (message: { type: string }) =>
    message.type === 'GET_PAGE_LINKS' ? snapshot : message.type === 'LOCATE_PAGE_LINK' ? { found: true } : null,
  ),
  getActiveTabId: vi.fn(async () => 1),
}))

vi.mock('@/core/permissions/siteAccess', () => ({
  requestAllSitesAccess: vi.fn(async () => true),
  requestSiteAccess: vi.fn(async () => true),
  hasAllSitesAccess: vi.fn(async () => true),
}))

vi.mock('@/core/messaging', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/messaging')>()),
  sendMessage: vi.fn(),
}))

vi.mock('@/chrome/contentScriptClient', () => ({
  getActiveBrowserTab: vi.fn(async () => ({ id: 1, url: snapshot.url })),
  ensureContentScriptInTab: vi.fn(async () => undefined),
}))

registerModules()

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <RedirectTracerTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  vi.mocked(sendMessage).mockImplementation(async (message) => {
    if (message.type === 'REDIRECT_TRACE_GET') return []
    if (message.type !== 'TRACE_HTTP_REDIRECTS') return undefined
    if (message.href.includes('short.test')) {
      return {
        hops: [
          { url: message.href, status: 301, durationMs: 20 },
          { url: 'https://example.com/sale', status: 200, durationMs: 30 },
        ],
        finalUrl: 'https://example.com/sale',
        status: 200,
        redirected: true,
        loop: false,
        durationMs: 50,
      }
    }
    return {
      hops: [{ url: message.href, status: 200, durationMs: 18 }],
      finalUrl: message.href,
      status: 200,
      redirected: false,
      loop: false,
      durationMs: 18,
    }
  })
})

afterEach(() => {
  cleanup()
})

describe('Redirect Checker', () => {
  it('traces a pasted URL and crawls page links for redirect cards', async () => {
    const user = userEvent.setup()
    renderTool()
    expect(await screen.findByText('Find redirects on this page')).toBeInTheDocument()

    const urlField = screen.getByLabelText('URL to trace')
    await user.clear(urlField)
    await user.type(urlField, 'https://short.test/go')
    await user.click(screen.getByRole('button', { name: 'Trace' }))

    expect(await screen.findByTitle('https://example.com/sale')).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('Permanent')

    await user.click(screen.getByRole('button', { name: 'Scan 2 links' }))
    await waitFor(() => {
      expect(screen.getByText('Campaign')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Redirects/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('About')).not.toBeInTheDocument()
  }, 15_000)
})
