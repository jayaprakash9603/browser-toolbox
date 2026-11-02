import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Autocomplete, type AutocompleteOption } from '@/shared/components/Autocomplete'

const options: AutocompleteOption[] = [
  { value: 'general', label: 'General / not tool-specific' },
  { value: 'device', label: 'Device Activated' },
  { value: 'clipboard', label: 'Clipboard Manager' },
]

describe('Autocomplete', () => {
  it('filters with universal-search matching and highlights matched characters', () => {
    render(
      <>
        <label htmlFor="tool-picker">Tool</label>
        <Autocomplete id="tool-picker" value="general" options={options} onValueChange={vi.fn()} />
      </>,
    )

    const input = screen.getByRole('combobox', { name: 'Tool' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'dva' } })

    expect(screen.getByRole('option', { name: 'Device Activated' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Clipboard Manager' })).not.toBeInTheDocument()
    expect(
      screen
        .getByRole('option', { name: 'Device Activated' })
        .querySelectorAll('[data-search-highlight]'),
    ).toHaveLength(3)
  })

  it('selects an active match with Enter and restores the selected label', () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <>
        <label htmlFor="tool-picker">Tool</label>
        <Autocomplete
          id="tool-picker"
          value="general"
          options={options}
          onValueChange={onValueChange}
        />
      </>,
    )

    const input = screen.getByRole('combobox', { name: 'Tool' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'clipboard' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onValueChange).toHaveBeenCalledWith('clipboard')
    rerender(
      <>
        <label htmlFor="tool-picker">Tool</label>
        <Autocomplete
          id="tool-picker"
          value="clipboard"
          options={options}
          onValueChange={onValueChange}
        />
      </>,
    )
    expect(screen.getByRole('combobox', { name: 'Tool' })).toHaveValue('Clipboard Manager')
  })

  it('announces empty matches and closes without changing the selection on Escape', () => {
    render(
      <>
        <label htmlFor="tool-picker">Tool</label>
        <Autocomplete id="tool-picker" value="general" options={options} onValueChange={vi.fn()} />
      </>,
    )

    const input = screen.getByRole('combobox', { name: 'Tool' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'missing option' } })
    expect(screen.getByRole('status')).toHaveTextContent('No matches found')

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('General / not tool-specific')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveClass('transition-none')
  })
})
