import { useEffect, useState } from 'react'

import { closePdfDocument, openPdfDocument, readPageInfo, type PdfDocumentHandle, type PdfPageInfo } from '@/core/engines/pdf/pdfjs'
import { releasePageImages } from './pageImages'

export type LoadedPdf =
  | { status: 'loading' }
  | { status: 'ready'; doc: PdfDocumentHandle; pages: PdfPageInfo[] }
  | { status: 'error'; error: unknown }

/** Opens `bytes` with PDF.js for display and closes it when the input changes or the caller unmounts. */
export function usePdfDocument(bytes: Uint8Array | Blob | null, password?: string): LoadedPdf {
  const [state, setState] = useState<{ source: Uint8Array | Blob; password?: string; result: LoadedPdf } | null>(null)

  useEffect(() => {
    if (!bytes) return
    let cancelled = false
    let opened: PdfDocumentHandle | null = null
    void (async () => {
      try {
        const data = bytes instanceof Blob ? new Uint8Array(await bytes.arrayBuffer()) : bytes
        const doc = await openPdfDocument(data, password)
        if (cancelled) {
          void closePdfDocument(doc)
          return
        }
        opened = doc
        const pages = await readPageInfo(doc)
        if (!cancelled) setState({ source: bytes, password, result: { status: 'ready', doc, pages } })
      } catch (error) {
        if (!cancelled) setState({ source: bytes, password, result: { status: 'error', error } })
      }
    })()
    return () => {
      cancelled = true
      if (opened) {
        releasePageImages(opened)
        void closePdfDocument(opened)
      }
    }
  }, [bytes, password])

  return state && state.source === bytes && state.password === password ? state.result : { status: 'loading' }
}
