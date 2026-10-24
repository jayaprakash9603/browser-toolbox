import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFDocument } from '@cantoo/pdf-lib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/app/App'
import { protectPdf } from '@/core/engines/pdf/edit'
import { registerModules } from '@/modules'
import { bytesBlob } from '@/shared/components/files'
import { TOOLS } from '@/tools/files/pdf-toolkit/toolList'

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
  Element.prototype.scrollIntoView ??= () => undefined
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
  it('lists every tool by category, filters them by search and opens one', async () => {
    const user = userEvent.setup()
    render(<App />)

    const search = await screen.findByLabelText('Search PDF tools', {}, LOAD)
    const categories = screen.getByRole('tablist', { name: 'Tool categories' })
    expect(within(categories).getAllByRole('tab')).toHaveLength(8)
    expect(within(categories).getByRole('tab', { selected: true })).toHaveTextContent(`All${TOOLS.length}`)
    expect(screen.getByRole('button', { name: 'Open Merge PDF' })).toBeInTheDocument()

    await user.type(search, 'docx')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Open Merge PDF' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Open Word to PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open PDF to Word' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open Word to PDF' }))
    expect(await screen.findByRole('heading', { name: 'Word to PDF' }, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'All PDF tools' }))
    expect(await screen.findByText('Recently used', {}, LOAD)).toBeInTheDocument()
  }, 30_000)

  it('maps old deep-link tabs to their new tools', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=stamp'
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Add watermark' }, LOAD)).toBeInTheDocument()
    expect(screen.getByLabelText('Open a PDF')).toBeInTheDocument()
  }, 20_000)

  it('splits a PDF page by page and lists every part in the results', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=split'
    const user = userEvent.setup()
    render(<App />)

    await user.upload(await screen.findByLabelText('Open a PDF', {}, LOAD), await pdfFile(4))
    await user.click(await screen.findByRole('radio', { name: 'Each page' }, LOAD))
    await user.click(screen.getByRole('button', { name: 'Split into 4 files' }))

    expect(await screen.findByRole('heading', { name: '4 files are ready' }, LOAD)).toBeInTheDocument()
    const files = screen.getByRole('list', { name: 'Files' })
    expect(within(files).getAllByRole('listitem')).toHaveLength(4)
    expect(within(files).getByText('report-page-1.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download all (ZIP)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to options' }))
    expect(screen.getByRole('button', { name: 'Split into 4 files' })).toBeVisible()
  }, 20_000)

  it('merges two PDFs in order into one file', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=merge'
    const user = userEvent.setup()
    render(<App />)

    const input = await screen.findByLabelText('Add PDFs and images to merge', {}, LOAD)
    await user.upload(input, [await pdfFile(2, 'first.pdf'), await pdfFile(3, 'second.pdf')])
    expect(await screen.findByText('5 pages in total', {}, LOAD)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Merge 2 files' }))
    expect(await screen.findByRole('heading', { name: 'Your file is ready' }, LOAD)).toBeInTheDocument()
    expect(screen.getAllByText('merged.pdf').length).toBeGreaterThan(0)

    window.location.hash = '#/tools/files/pdf-toolkit?tab=compress'
    expect(await screen.findByRole('heading', { name: 'Compress PDF' }, LOAD)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Your file is ready' })).not.toBeInTheDocument())
    expect(screen.getByLabelText('Open a PDF')).toBeInTheDocument()
  }, 20_000)

  it('removes pages picked by range and keeps working on the result', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=remove-pages'
    const user = userEvent.setup()
    render(<App />)

    await user.upload(await screen.findByLabelText('Open a PDF', {}, LOAD), await pdfFile(3))
    await user.type(await screen.findByLabelText('Select pages by range', {}, LOAD), '2')
    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.getByText('1 of 3 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove 1 page' }))

    expect(await screen.findByRole('heading', { name: 'Your file is ready' }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('1 page removed, 2 left.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep working on this' }))

    expect(await screen.findByText('Edited copy', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('2 pages')).toBeInTheDocument()
  }, 20_000)

  it('asks for the password of a protected PDF and offers to remove it', async () => {
    window.location.hash = '#/tools/files/pdf-toolkit?tab=unlock'
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
    expect(await screen.findByRole('button', { name: 'Unlock PDF' }, LOAD)).toBeInTheDocument()
  }, 20_000)
})
