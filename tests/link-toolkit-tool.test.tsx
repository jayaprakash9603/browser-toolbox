import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import type { PageLink, PageLinksSnapshot } from '@/core/engines/links/pageLinks'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import LinkToolkitTool from '@/tools/web/link-toolkit/Tool'

const tabMock = vi.hoisted(() => ({ locate: { found: true, visible: true } }))

function link(partial: Partial<PageLink> & Pick<PageLink, 'index' | 'href' | 'kind' | 'text'>): PageLink {
  let host = ''
  try {
    host = new URL(partial.href).hostname
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
    ...partial,
  }
}

const snapshot: PageLinksSnapshot = {
  url: 'https://example.com/',
  title: 'Example home',
  host: 'example.com',
  truncated: false,
  links: [
    link({ index: 0, href: 'https://example.com/', kind: 'internal', text: 'Home', section: 'header' }),
    link({ index: 1, href: 'https://example.com/docs', kind: 'internal', text: 'Docs', section: 'nav' }),
    link({ index: 2, href: 'https://example.com/docs', kind: 'internal', text: 'Read the docs' }),
    link({ index: 3, href: 'https://github.com/acme', kind: 'external', text: 'GitHub', section: 'footer', newTab: true }),
    link({ index: 4, href: 'https://broken.test/page', kind: 'external', text: 'Old partner' }),
    link({ index: 5, href: 'https://example.com/#faq', kind: 'anchor', text: 'FAQ', host: 'example.com' }),
    link({ index: 6, href: 'mailto:hi@example.com', kind: 'email', text: 'Email us', section: 'footer' }),
    link({ index: 7, href: 'https://example.com/icon', kind: 'internal', text: '' }),
  ],
}

vi.mock('@/tools/web/tabMessaging', () => ({
  sendToActiveTab: vi.fn(async (message: { type: string }) =>
    message.type === 'GET_PAGE_LINKS' ? snapshot : message.type === 'LOCATE_PAGE_LINK' ? tabMock.locate : null,
  ),
}))

vi.mock('@/core/messaging', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/messaging')>()),
  sendMessage: vi.fn(async (message: { type: string; items?: { href: string }[] }) =>
    message.type === 'CHECK_HTTP_URLS'
      ? message.items?.map(({ href }) => {
          const broken = href.includes('broken.test')
          return { href, text: '', status: broken ? 404 : 200, ok: !broken }
        })
      : undefined,
  ),
}))

registerModules()

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <LinkToolkitTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

function rows() {
  return screen.getAllByRole('listitem').filter((item) => item.querySelector('[aria-expanded]'))
}

beforeEach(() => {
  tabMock.locate = { found: true, visible: true }
})

afterEach(() => {
  cleanup()
})

describe('Link Toolkit', () => {
  it('summarises the page and merges repeated URLs', async () => {
    const user = userEvent.setup()
    renderTool()
    expect(await screen.findByText('Example home')).toBeInTheDocument()
    const stats = screen.getByText('Unique URLs').closest('dl')!
    expect(within(stats).getByText('8')).toBeInTheDocument()
    expect(within(stats).getByText('7')).toBeInTheDocument()
    expect(within(stats).getByText('2')).toBeInTheDocument()
    expect(rows()).toHaveLength(7)
    expect(screen.getByLabelText('Found 2 times')).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Merge' }))
    expect(rows()).toHaveLength(8)
  })

  it('filters by type, search and quick filters', async () => {
    const user = userEvent.setup()
    renderTool()
    await screen.findByText('Example home')

    const types = within(screen.getByRole('group', { name: 'Filter by link type' }))
    const quick = within(screen.getByRole('group', { name: 'Quick filters' }))

    await user.click(types.getByRole('button', { name: /^External/ }))
    expect(types.getByRole('button', { name: /^External/ })).toHaveAttribute('aria-pressed', 'true')
    expect(rows().map((row) => within(row).getAllByRole('button')[0].textContent)).toEqual([
      expect.stringContaining('GitHub'),
      expect.stringContaining('Old partner'),
    ])

    await user.click(types.getByRole('button', { name: /^All/ }))
    await user.click(quick.getByRole('button', { name: /^No link text/ }))
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('/icon')

    await user.click(quick.getByRole('button', { name: /^No link text/ }))
    await user.click(screen.getByRole('searchbox'))
    await user.paste('zzz-nothing')
    expect(screen.getByText('No links match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(rows()).toHaveLength(7)
  })

  it('checks link status and isolates broken links', async () => {
    const user = userEvent.setup()
    renderTool()
    await screen.findByText('Example home')

    await user.click(screen.getByRole('button', { name: 'Check links' }))
    const summary = await screen.findByRole('button', { name: /1 broken · 4 working/ })
    expect(screen.getByText('404 Broken')).toBeInTheDocument()

    await user.click(summary)
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('Old partner')).toBeInTheDocument()
  })

  it('groups links by destination site', async () => {
    const user = userEvent.setup()
    renderTool()
    await screen.findByText('Example home')

    await user.click(screen.getByRole('radio', { name: /Sites/ }))
    expect(screen.getByText('5 destinations')).toBeInTheDocument()
    expect(screen.getByText('This site')).toBeInTheDocument()
    const github = screen.getByRole('button', { name: /github\.com/ })
    expect(github).toHaveAttribute('aria-expanded', 'false')

    await user.click(github)
    expect(github).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  it('explains when a located link is hidden on the page', async () => {
    const user = userEvent.setup()
    tabMock.locate = { found: true, visible: false }
    renderTool()
    await screen.findByText('Example home')

    await user.click(screen.getAllByRole('button', { name: 'Show on page' })[0])
    expect(await screen.findAllByText('That link exists but is hidden on the page right now.')).not.toHaveLength(0)
  })
})
