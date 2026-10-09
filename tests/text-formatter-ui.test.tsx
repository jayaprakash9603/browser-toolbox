import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FormatLanguageSelect } from '@/tools/text/text-formatter/FormatLanguageSelect'

afterEach(cleanup)

describe('FormatLanguageSelect', () => {
  it('shows compact auto trigger with detected format badge', () => {
    render(
      <FormatLanguageSelect value="auto" detectedFormat="json" onValueChange={() => {}} />,
    )
    expect(screen.getByRole('combobox', { name: 'Format selection' })).toHaveTextContent('Auto')
    expect(screen.getByText('JSON')).toBeInTheDocument()
  })

  it('shows manual selection label in the trigger', () => {
    render(
      <FormatLanguageSelect value="css" detectedFormat="plain-text" onValueChange={() => {}} />,
    )
    expect(screen.getByRole('combobox', { name: 'Format selection' })).toHaveTextContent('CSS')
  })
})
