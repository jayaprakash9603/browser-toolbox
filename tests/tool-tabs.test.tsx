import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

afterEach(cleanup)

describe('tool tab navigation', () => {
  it('keeps selection, disabled states and keyboard navigation with the new rail', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="data">
        <TabsList aria-label="Converter modes">
          <TabsTrigger value="data">Data Formats</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="disabled" disabled>
            Unavailable
          </TabsTrigger>
          <TabsTrigger value="bases">Number Bases</TabsTrigger>
        </TabsList>
        <TabsContent value="data">Convert data</TabsContent>
        <TabsContent value="units">Convert units</TabsContent>
        <TabsContent value="bases">Convert bases</TabsContent>
      </Tabs>,
    )
    await user.click(screen.getByRole('tab', { name: 'Data Formats' }))
    await user.keyboard('{ArrowRight}')
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Units' })).toHaveAttribute('aria-selected', 'true'),
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Convert units')
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Number Bases' })).toHaveFocus())
    await user.keyboard('{Home}')
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Data Formats' })).toHaveFocus())
    expect(screen.getByRole('tab', { name: 'Unavailable' })).toBeDisabled()
  })

  it('pads attached tab panels with the density card token', () => {
    render(
      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="data">Convert data</TabsContent>
      </Tabs>,
    )
    expect(screen.getByRole('tabpanel').className).toContain('p-[var(--density-card-pad)]')
  })

  it('lets full-bleed panels opt out of attached padding', () => {
    render(
      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="p-0">
          Flush
        </TabsContent>
      </Tabs>,
    )
    expect(screen.getByRole('tabpanel').className).toMatch(/\bp-0\b/)
    expect(screen.getByRole('tabpanel').className).not.toContain('density-card-pad')
  })
})
