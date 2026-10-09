import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/app/App'
import { registerModules } from '@/modules'
import { detectFileKind, splitFileName } from '@/tools/files/file-toolkit/fileKinds'

registerModules()
afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  window.location.hash = '#/tools/files/file-toolkit'
})

const CSV = [
  'id,street1,street2,city,postCode',
  'AUS-0001,NUNDAH,140581184,NUNDAH,4012',
  'AUS-0002,SYDNEY,10,SYDNEY,2000',
  'AUS-0003,MELBOURNE,22,MELBOURNE,3000',
].join('\n')

describe('file kind helpers', () => {
  it('detects kinds by extension before MIME type', () => {
    expect(detectFileKind({ name: 'address-catalog.csv', type: 'application/vnd.ms-excel' })).toBe('csv')
    expect(detectFileKind({ name: 'export.TSV', type: '' })).toBe('csv')
    expect(detectFileKind({ name: 'payload.json', type: '' })).toBe('json')
    expect(detectFileKind({ name: 'notes.md', type: '' })).toBe('text')
    expect(detectFileKind({ name: 'photo.png', type: 'image/png' })).toBeNull()
  })

  it('keeps the extension separate so it stays visible when the name truncates', () => {
    expect(splitFileName('address-catalog.csv')).toEqual({ base: 'address-catalog', extension: 'CSV' })
    expect(splitFileName('README')).toEqual({ base: 'README', extension: '' })
  })
})

describe('File Toolkit', () => {
  it('shows a file summary and a full table for a loaded CSV', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Drop a CSV or TSV file', {}, { timeout: 10000 })
    await user.upload(input, new File([`\uFEFF${CSV}`], 'address-catalog.csv', { type: 'text/csv' }))

    expect(await screen.findByText('address-catalog')).toBeInTheDocument()
    expect(screen.getByText('3 rows')).toBeInTheDocument()
    expect(screen.getByText('5 columns')).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(within(table).getByRole('button', { name: 'id' })).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByText('AUS-0001')).toBeInTheDocument()
  })

  it('filters and sorts CSV rows', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Drop a CSV or TSV file', {}, { timeout: 10000 })
    await user.upload(input, new File([CSV], 'address-catalog.csv', { type: 'text/csv' }))

    await user.type(await screen.findByLabelText('Filter rows'), 'sydney')
    expect(await screen.findByText('1 of 3 rows')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Filter rows'))
    await user.click(screen.getByRole('button', { name: 'postCode' }))
    await user.click(screen.getByRole('button', { name: 'postCode' }))
    const header = screen.getByRole('columnheader', { name: 'postCode' })
    expect(header).toHaveAttribute('aria-sort', 'descending')
    const firstDataRow = within(screen.getByRole('table')).getAllByRole('row')[1]
    expect(within(firstDataRow).getByText('4012')).toBeInTheDocument()
  })

  it('routes a JSON file dropped on the CSV tab to the JSON tab', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<App />)

    const input = await screen.findByLabelText('Drop a CSV or TSV file', {}, { timeout: 10000 })
    await user.upload(input, new File(['{"a":1,"b":[1,2]}'], 'payload.json', { type: 'application/json' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Opened payload.json in the JSON tab.')
    expect(screen.getByRole('tab', { name: 'JSON' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('2 top-level keys')).toBeInTheDocument()
  })
})
