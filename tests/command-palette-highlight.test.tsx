import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HighlightedText } from '@/features/command-palette/HighlightedText'

describe('command palette search highlighting', () => {
  it('highlights case-insensitive text matches without changing the label', () => {
    const { container } = render(<HighlightedText text="Clipboard Manager" query="clip" />)

    expect(container.textContent).toBe('Clipboard Manager')
    const highlighted = container.querySelector('[data-search-highlight]')
    expect(highlighted?.textContent).toBe('Clip')
    expect(highlighted).toHaveClass('font-semibold', 'text-primary')
    expect(highlighted).not.toHaveClass('bg-primary/10', 'px-0.5')
  })

  it('highlights an exact phrase as one text-only match across spaces', () => {
    const { container } = render(<HighlightedText text="Clipboard Manager" query="clipboard manager" />)

    const highlighted = container.querySelector('[data-search-highlight]')
    expect(highlighted?.textContent).toBe('Clipboard Manager')
    expect(container.querySelectorAll('[data-search-highlight]')).toHaveLength(1)
  })

  it('highlights the visible query prefix when the rest matches a hidden keyword', () => {
    const { container } = render(<HighlightedText text="Clipboard Search" query="clic" />)

    expect(container.querySelector('[data-search-highlight]')?.textContent).toBe('Cli')
  })

  it('highlights fuzzy character matches and leaves unmatched text intact', () => {
    const { container } = render(<HighlightedText text="Device Activated" query="dva" />)

    expect(container.textContent).toBe('Device Activated')
    expect([...container.querySelectorAll('[data-search-highlight]')].map((node) => node.textContent)).toEqual([
      'D',
      'v',
      'A',
    ])
  })
})