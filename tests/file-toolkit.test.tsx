import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/app/App'
import { registerModules } from '@/modules'
import { splitFileName } from '@/tools/files/file-toolkit/fileKinds'

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
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  window.location.hash = '#/tools/files/file-toolkit'
})

const CSV = [
  'id,street1,street2,city,postCode',
  'AUS-0001,NUNDAH,140581184,NUNDAH,4012',
  'AUS-0002,SYDNEY,10,SYDNEY,2000',
  'AUS-0003,MELBOURNE,22,MELBOURNE,3000',
].join('\n')

const LOAD = { timeout: 15_000 }

describe('file name helpers', () => {
  it('keeps the extension separate so it stays visible when the name truncates', () => {
    expect(splitFileName('address-catalog.csv')).toEqual({ base: 'address-catalog', extension: 'CSV' })
    expect(splitFileName('archive.tar.gz')).toEqual({ base: 'archive.tar', extension: 'GZ' })
    expect(splitFileName('README')).toEqual({ base: 'README', extension: '' })
    expect(splitFileName('.env')).toEqual({ base: '.env', extension: '' })
  })
})

describe('File Toolkit', () => {
  it('opens on the batch converter with all six tools available', async () => {
    render(<App />)
    expect(await screen.findByLabelText('Drop the files you want to convert', {}, LOAD)).toBeInTheDocument()
    const tiles = screen.getByRole('tablist', { name: 'File Toolkit tools' })
    expect(within(tiles).getAllByRole('tab')).toHaveLength(6)
    expect(within(tiles).getByRole('tab', { name: /^Convert/ })).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('Convert files in bulk')).toBeInTheDocument()
  }, 20_000)

  it('maps old CSV deep links to the viewer and keeps table filtering and sorting', async () => {
    window.location.hash = '#/tools/files/file-toolkit?tab=csv'
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Drop a data or text file to view it', {}, LOAD)
    expect(screen.getByRole('tab', { name: /^View/ })).toHaveAttribute('data-state', 'active')
    await user.upload(input, new File([`\uFEFF${CSV}`], 'address-catalog.csv', { type: 'text/csv' }))

    expect(await screen.findByText('address-catalog')).toBeInTheDocument()
    expect(screen.getByText('3 rows')).toBeInTheDocument()
    expect(screen.getByText('5 columns')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Filter rows'), 'sydney')
    expect(await screen.findByText('1 of 3 rows')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Filter rows'))
    await user.click(screen.getByRole('button', { name: 'postCode' }))
    await user.click(screen.getByRole('button', { name: 'postCode' }))
    expect(screen.getByRole('columnheader', { name: 'postCode' })).toHaveAttribute('aria-sort', 'descending')
  }, 20_000)

  it('converts a CSV to Excel and JSON and previews each result before saving', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Drop the files you want to convert', {}, LOAD)
    await user.upload(input, new File([CSV], 'address-catalog.csv', { type: 'text/csv' }))

    const formats = await screen.findByRole('group', { name: 'Data files' })
    expect(within(formats).getByRole('button', { name: 'Excel' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(formats).getByRole('button', { name: 'JSON' }))

    await user.click(screen.getByRole('button', { name: 'Convert · 2 files to create' }))

    const dialog = await screen.findByRole('dialog', {}, LOAD)
    expect(within(dialog).getByLabelText('File name')).toHaveValue('address-catalog')
    expect(within(dialog).getByText('.xlsx')).toBeInTheDocument()
    expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()
    expect(within(dialog).getByText('AUS-0002')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Next file' }))
    await waitFor(() => expect(within(dialog).getByText('.json')).toBeInTheDocument())

    await user.click(within(dialog).getByRole('button', { name: 'Download' }))
    expect(await within(dialog).findByText('Saved')).toBeInTheDocument()
    expect(URL.createObjectURL).toHaveBeenCalled()
  }, 20_000)

  it('writes Markdown into a Word document with a live preview', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('tab', { name: /^Text to doc/ }, LOAD))
    expect(screen.getByText('Your document appears here')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sample' }))

    const formats = screen.getByRole('radiogroup', { name: 'Output format' })
    await user.click(within(formats).getByRole('radio', { name: 'Word' }))
    expect(await screen.findByRole('heading', { name: 'Quarterly project update' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Preview & save as Word' }))
    const dialog = await screen.findByRole('dialog', {}, LOAD)
    expect(within(dialog).getByLabelText('File name')).toHaveValue('Quarterly project update')
    expect(within(dialog).getByText('.docx')).toBeInTheDocument()
  }, 20_000)

  it('shows checksums for a file and verifies a pasted hash', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('tab', { name: /^Inspect/ }, LOAD))
    await user.upload(screen.getByLabelText('Drop any file to inspect it'), new File(['abc'], 'abc.txt', { type: 'text/plain' }))

    const sha256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(await screen.findByText(sha256, {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('900150983cd24fb0d6963f7d28e17f72')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Verify a checksum'), sha256.toUpperCase())
    expect(await screen.findByText('Matches the SHA-256 checksum')).toBeInTheDocument()
  }, 20_000)
})
