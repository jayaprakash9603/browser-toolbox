import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { HistoryItem } from '@/tools/clipboard/_HistoryItem'

describe('clipboard history item', () => {
  it('shows copy, paste, pin and delete on each entry', () => {
    const entry = {
      id: 'entry-1',
      text: 'Clipboard sample',
      createdAt: Date.now(),
      pinned: false,
      charCount: 16,
      wordCount: 2,
    }

    render(
      <I18nextProvider i18n={i18n}>
        <HistoryItem entry={entry} onChanged={vi.fn()} />
      </I18nextProvider>,
    )

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Paste' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('expands the full clipboard text', async () => {
    const user = userEvent.setup()
    const text = Array.from({ length: 12 }, (_, index) => `line ${index} of a long clipboard entry`).join('\n')
    render(
      <I18nextProvider i18n={i18n}>
        <HistoryItem
          entry={{
            id: 'entry-2',
            text,
            createdAt: Date.now(),
            pinned: false,
            charCount: text.length,
            wordCount: 40,
          }}
          onChanged={vi.fn()}
        />
      </I18nextProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Show full text' }))
    expect(screen.getByText(/line 11 of a long clipboard entry/)).toBeVisible()
  })
})