import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { EditorPane } from '@/shared/components/EditorPane'
import { SearchInput } from '@/shared/components/SearchInput'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { Segmented } from '@/shared/components/ui/segmented'

afterEach(cleanup)

describe('EditorPane', () => {
  it('renders a labelled CodeMirror editor with a status footer', () => {
    render(
      <TooltipProvider>
        <EditorPane
          value={'{\n  "a": 1\n}'}
          onChange={() => undefined}
          label="Input"
          language="json"
          ariaLabel="JSON input"
          status={{ tone: 'valid', text: 'Valid JSON' }}
        />
      </TooltipProvider>,
    )

    expect(screen.getByRole('textbox', { name: 'JSON input' })).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('3 lines')).toBeInTheDocument()
    expect(screen.getByText('Valid JSON')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle word wrap' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('hides editing actions for read-only output', () => {
    render(
      <TooltipProvider>
        <EditorPane value="done" readOnly label="Output" />
      </TooltipProvider>,
    )

    expect(screen.getByText('Read only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Paste' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled()
  })
})

describe('Segmented', () => {
  it('selects options by click and arrow keys', () => {
    function Harness() {
      const [value, setValue] = useState<'a' | 'b' | 'c'>('a')
      return (
        <Segmented
          value={value}
          onValueChange={setValue}
          ariaLabel="Mode"
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
          ]}
        />
      )
    }
    render(<Harness />)

    fireEvent.click(screen.getByRole('radio', { name: 'B' }))
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'true')

    fireEvent.keyDown(screen.getByRole('radio', { name: 'B' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus()
  })
})

describe('SearchInput', () => {
  it('clears with the clear button and Escape', () => {
    function Harness() {
      const [value, setValue] = useState('json')
      return <SearchInput value={value} onChange={setValue} ariaLabel="Search tools" shortcut="/" />
    }
    render(<Harness />)

    const input = screen.getByRole('searchbox', { name: 'Search tools' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(input).toHaveValue('')

    fireEvent.change(input, { target: { value: 'yaml' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('')

    input.blur()
    fireEvent.keyDown(window, { key: '/' })
    expect(input).toHaveFocus()
  })
})
