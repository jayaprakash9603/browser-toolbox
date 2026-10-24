import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import NotesTool from '@/tools/productivity/notes/Tool'
import { resetChromeMockStorage } from './setup'

registerModules()

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <NotesTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

async function storedNotes() {
  const result = await chrome.storage.local.get('toolbox.notes')
  return result['toolbox.notes'] as { title: string; body: string; color: string }[]
}

beforeEach(() => {
  resetChromeMockStorage()
})

afterEach(() => {
  cleanup()
})

describe('Notes tool', { timeout: 20_000 }, () => {
  it('loads legacy notes and shows a derived title and snippet', async () => {
    await chrome.storage.local.set({
      'toolbox.notes': [{ id: 'n1', title: '', body: 'hello india\nindia', pinned: false, updatedAt: Date.now() }],
    })
    renderTool()
    expect(await screen.findByText('hello india')).toBeInTheDocument()
    expect(screen.getByText('india')).toBeInTheDocument()
    expect(screen.getByText('1 note')).toBeInTheDocument()
  })

  it('creates a note, applies formatting shortcuts and autosaves', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('button', { name: 'New note' }))
    const editor = await screen.findByRole('textbox', { name: 'Take a note…' })
    fireEvent.change(editor, { target: { value: 'groceries' } })
    ;(editor as HTMLTextAreaElement).setSelectionRange(0, 9)
    fireEvent.keyDown(editor, { key: 'b', ctrlKey: true })
    await waitFor(() => expect(editor).toHaveValue('**groceries**'))
    expect(screen.getByText('1 word')).toBeInTheDocument()
    await waitFor(async () => expect((await storedNotes())[0].body).toBe('**groceries**'))
  })

  it('finds and replaces all matches', async () => {
    const user = userEvent.setup()
    await chrome.storage.local.set({
      'toolbox.notes': [{ id: 'n1', title: 'Trip', body: 'cat Cat cat', pinned: false, updatedAt: 1 }],
    })
    renderTool()
    await user.click(await screen.findByText('Trip'))
    const editor = screen.getByRole('textbox', { name: 'Take a note…' })
    fireEvent.keyDown(editor, { key: 'h', ctrlKey: true })
    fireEvent.change(screen.getByRole('textbox', { name: 'Find' }), { target: { value: 'cat' } })
    expect(screen.getByText('1/3')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Replace with' }), { target: { value: 'dog' } })
    await user.click(screen.getByRole('button', { name: 'Replace all' }))
    await waitFor(() => expect(editor).toHaveValue('dog dog dog'))
  })

  it('changes color and deletes after confirmation', async () => {
    const user = userEvent.setup()
    await chrome.storage.local.set({
      'toolbox.notes': [{ id: 'n1', title: 'Temp', body: 'x', pinned: false, updatedAt: 1 }],
    })
    renderTool()
    await user.click(await screen.findByText('Temp'))
    await user.click(screen.getByRole('button', { name: 'Note color' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Yellow' }))
    await waitFor(async () => expect((await storedNotes())[0].color).toBe('yellow'))

    await user.click(screen.getByRole('button', { name: 'Note options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete note' }))
    await user.click(await screen.findByRole('button', { name: 'Delete note' }))
    await waitFor(async () => expect(await storedNotes()).toHaveLength(0))
  })

  it('previews markdown and toggles checklist items', async () => {
    const user = userEvent.setup()
    await chrome.storage.local.set({
      'toolbox.notes': [{ id: 'n1', title: 'Todo', body: '- [ ] milk', pinned: false, updatedAt: 1 }],
    })
    renderTool()
    await user.click(await screen.findByText('Todo'))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('checkbox'))
    await waitFor(async () => expect((await storedNotes())[0].body).toBe('- [x] milk'))
  })
})
