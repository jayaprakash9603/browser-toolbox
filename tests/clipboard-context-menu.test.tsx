import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { HistoryItem } from '@/tools/clipboard/_HistoryItem'

describe('clipboard history context menu', () => {
  it('offers copy, pin and delete actions on right click', () => {
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
    fireEvent.contextMenu(screen.getByText('Clipboard sample'), {
      button: 2,
      clientX: 40,
      clientY: 40,
    })

    expect(screen.getByRole('menuitem', { name: 'Copy again' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Pin' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })
})