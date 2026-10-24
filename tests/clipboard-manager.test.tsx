import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import { STORAGE_KEYS } from '@/core/constants'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import ClipboardManagerTool from '@/tools/clipboard/clipboard-manager/Tool'
import { resetChromeMockStorage } from './setup'

registerModules()

const DAY = 86_400_000

function seed() {
  const now = Date.now()
  const entry = (id: string, text: string, createdAt: number, pinned = false) => ({
    id,
    text,
    createdAt,
    pinned,
    charCount: text.length,
    wordCount: text.trim().split(/\s+/).length,
  })
  return chrome.storage.local.set({
    [STORAGE_KEYS.clipboardHistory]: [
      entry('today-link', 'https://quickcalci.com/sitemap.xml', now - 60_000),
      entry('today-text', 'Physics calculators solve the core equations', now - 120_000),
      entry('old-ip', '45.252.75.69', now - 3 * DAY),
      entry('pinned-code', 'const total = items.length;', now - 5 * DAY, true),
    ],
  })
}

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ClipboardManagerTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(async () => {
  resetChromeMockStorage()
  await seed()
})

afterEach(cleanup)

describe('Clipboard Manager', () => {
  it('groups entries with pinned items first', async () => {
    renderTool()
    const headings = await screen.findAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual(['Pinned', 'Today', 'Earlier'])
    expect(screen.getByText('4 items')).toBeInTheDocument()
  })

  it('filters by kind and search text', async () => {
    const user = userEvent.setup()
    renderTool()
    await screen.findByText('https://quickcalci.com/sitemap.xml')

    await user.click(screen.getByRole('button', { name: /Links/ }))
    expect(screen.getByText('https://quickcalci.com/sitemap.xml')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('45.252.75.69')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /All/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search clipboard' }), 'physics')
    expect(
      await screen.findByText('Physics calculators solve the core equations'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText('https://quickcalci.com/sitemap.xml')).not.toBeInTheDocument(),
    )
  })

  it('deletes an entry and restores it with undo', async () => {
    const user = userEvent.setup()
    renderTool()
    const text = await screen.findByText('45.252.75.69')
    const card = text.closest('article') as HTMLElement

    await user.click(within(card).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Item deleted')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('45.252.75.69')).toBeInTheDocument()
    const stored = (await chrome.storage.local.get(STORAGE_KEYS.clipboardHistory))[
      STORAGE_KEYS.clipboardHistory
    ]
    expect(stored).toHaveLength(4)
  })
})
