import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from '@cantoo/pdf-lib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/app/App'
import { protectPdf } from '@/core/engines/pdf/edit'
import { registerModules } from '@/modules'
import { bytesBlob } from '@/shared/components/files'

const PASSWORD = 'open-sesame'

// PDF.js needs a worker and a real canvas, so page rendering and text are faked; pdf-lib still does the editing.
vi.mock('@/core/engines/pdf/pdfjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/engines/pdf/pdfjs')>()
  const { PDFDocument: Doc } = await import('@cantoo/pdf-lib')
  return {
    ...actual,
    openPdfDocument: vi.fn(async (bytes: Uint8Array, password?: string) => {
      if (new TextDecoder('latin1').decode(bytes).includes('/Encrypt') && password !== PASSWORD) {
        throw new actual.PdfPasswordError(password !== undefined)
      }
      const doc = await Doc.load(bytes, { ignoreEncryption: true })
      return { numPages: doc.getPageCount(), loadingTask: { destroy: async () => undefined } }
    }),
    readPageInfo: vi.fn(async (handle: { numPages: number }) =>
      Array.from({ length: handle.numPages }, () => ({ width: 612, height: 792, rotation: 0 })),
    ),
    renderPdfPageBlob: vi.fn(async () => new Blob(['page'], { type: 'image/webp' })),
    extractPageText: vi.fn(async (_handle: unknown, page: number) => `Quarterly report page ${page}`),
    closePdfDocument: vi.fn(async () => undefined),
  }
})

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
  Element.prototype.scrollTo ??= () => undefined
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  window.location.hash = '#/tools/files/pdf-toolkit'
})

const LOAD = { timeout: 15_000 }

async function pdfFile(pages: number, name = 'report.pdf', password?: string): Promise<File> {
  const doc = await PDFDocument.create()
  for (let index = 0; index < pages; index += 1) doc.addPage([612, 792])
  let bytes: Uint8Array = await doc.save()
  if (password) bytes = await protectPdf({ bytes }, { userPassword: password, allowPrinting: true, allowCopying: true, allowEditing: false })
  return new File([bytesBlob(bytes, 'application/pdf')], name, { type: 'application/pdf' })
}

describe('PDF Toolkit', () => {
  it('opens a PDF to read and search it, with all nine tools available', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Open a PDF', {}, LOAD)
    const tiles = screen.getByRole('tablist', { name: 'PDF Toolkit tools' })
    expect(within(tiles).getAllByRole('tab')).toHaveLength(9)
    expect(within(tiles).getByRole('tab', { name: /^Read/ })).toHaveAttribute('data-state', 'active')

    await user.upload(input, await pdfFile(3))
    expect(await screen.findByText('report.pdf', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('3 pages')).toBeInTheDocument()
    await waitFor(() => expect(document.querySelectorAll('img[src="blob:mock"]').length).toBeGreaterThanOrEqual(3))

    await user.type(screen.getByLabelText('Find in document'), 'report{Enter}')
    expect(await screen.findByText('3 matches on 3 pages')).toBeInTheDocument()
  }, 20_000)

  it('splits a PDF page by page and previews every part', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=split'
    const user = userEvent.setup()
    render(<App />)

    await user.upload(await screen.findByLabelText('Open a PDF', {}, LOAD), await pdfFile(4))
    await user.click(await screen.findByRole('radio', { name: 'Each page' }, LOAD))
    await user.click(screen.getByRole('button', { name: 'Split into 4 files' }))

    const dialog = await screen.findByRole('dialog', {}, LOAD)
    expect(within(dialog).getByLabelText('File name')).toHaveValue('report-page-1')
    expect(within(dialog).getByText('1 / 4')).toBeInTheDocument()
  }, 20_000)

  it('merges two PDFs in order into one file', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=merge'
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Add PDFs and images to merge', {}, LOAD)
    await user.upload(input, [await pdfFile(2, 'first.pdf'), await pdfFile(3, 'second.pdf')])
    expect(await screen.findByText('5 pages in total', {}, LOAD)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Merge 2 files' }))
    const dialog = await screen.findByRole('dialog', {}, LOAD)
    expect(within(dialog).getByLabelText('File name')).toHaveValue('merged')
    expect(await within(dialog).findByText('Page 5 of 5', {}, LOAD)).toBeInTheDocument()
  }, 20_000)

  it('deletes a page and keeps editing the organized result', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=organize'
    const user = userEvent.setup()
    render(<App />)

    await user.upload(await screen.findByLabelText('Open a PDF', {}, LOAD), await pdfFile(3))
    await user.click(await screen.findByRole('button', { name: 'Delete page 2' }, LOAD))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save PDF (2 pages)' }))

    const dialog = await screen.findByRole('dialog', {}, LOAD)
    expect(within(dialog).getByLabelText('File name')).toHaveValue('report-organized')
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Edited copy')).toBeInTheDocument()
    expect(screen.getByText('No changes yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save PDF (2 pages)' })).toBeInTheDocument()
  }, 20_000)

  it('asks for the password of a protected PDF and offers to remove it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.upload(await screen.findByLabelText('Open a PDF', {}, LOAD), await pdfFile(2, 'locked.pdf', PASSWORD))
    expect(await screen.findByText('This PDF is password protected', {}, LOAD)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('That password is not correct.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('Password protected', {}, LOAD)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Protect/ }))
    expect(await screen.findByRole('button', { name: 'Remove password' }, LOAD)).toBeInTheDocument()
  }, 20_000)
})
