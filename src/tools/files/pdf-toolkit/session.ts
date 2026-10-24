import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import type { PdfSource } from '@/core/engines/pdf/edit'
import {
  closePdfDocument,
  openPdfDocument,
  PdfPasswordError,
  readPageInfo,
  type PdfDocumentHandle,
  type PdfPageInfo,
} from '@/core/engines/pdf/pdfjs'
import { bytesBlob, createArtifact, splitFileName, type FileArtifact } from '@/shared/components/files'
import { releasePageImages } from '@/shared/components/pdf'

/** The PDF every panel works on. */
export interface OpenPdf {
  /** New for every load, so panels can reset when the document changes. */
  id: string
  name: string
  bytes: Uint8Array
  password?: string
  handle: PdfDocumentHandle
  pages: PdfPageInfo[]
  /** Set once a result replaced the original file. */
  edited: boolean
}

export type SessionState =
  | { status: 'empty' }
  | { status: 'opening'; name: string }
  | { status: 'locked'; name: string; bytes: Uint8Array; incorrect: boolean; unlocking: boolean }
  | { status: 'error'; name: string }
  | { status: 'ready'; doc: OpenPdf }

export interface Results {
  artifacts: FileArtifact[]
  zipName?: string
}

export interface PdfSession {
  state: SessionState
  open: (file: File) => Promise<void>
  unlock: (password: string) => Promise<void>
  close: () => void
  /** Makes a finished PDF the document every panel works on. */
  adopt: (artifact: FileArtifact) => Promise<void>
  results: Results | null
  showResults: (results: Results | null) => void
}

export const PdfSessionContext = createContext<PdfSession | null>(null)

export function usePdfSession(): PdfSession {
  const session = useContext(PdfSessionContext)
  if (!session) throw new Error('usePdfSession needs a PdfSessionContext provider')
  return session
}

/** The open document; only call from panels that render once a document is ready. */
export function useOpenPdf(): OpenPdf {
  const { state } = usePdfSession()
  if (state.status !== 'ready') throw new Error('No PDF is open')
  return state.doc
}

export function sourceOf(doc: Pick<OpenPdf, 'bytes' | 'password'>): PdfSource {
  return { bytes: doc.bytes, password: doc.password }
}

export function stemOf(doc: Pick<OpenPdf, 'name'>): string {
  return splitFileName(doc.name).stem || 'document'
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
  return head.includes('%PDF-')
}

/** A PDF result shown in the preview dialog; `source` drives the size comparison. */
export function pdfArtifact(name: string, bytes: Uint8Array, init: Pick<FileArtifact, 'source' | 'note'> & { password?: string } = {}): FileArtifact {
  const { password, ...rest } = init
  return createArtifact({ name, blob: bytesBlob(bytes, 'application/pdf'), format: 'PDF', preview: { kind: 'pdfFile', password }, ...rest })
}

export function usePdfSessionController(): PdfSession {
  const [state, setState] = useState<SessionState>({ status: 'empty' })
  const [results, setResults] = useState<Results | null>(null)
  const current = useRef<PdfDocumentHandle | null>(null)
  const request = useRef(0)

  const dispose = useCallback(() => {
    const handle = current.current
    current.current = null
    if (handle) {
      releasePageImages(handle)
      void closePdfDocument(handle)
    }
  }, [])

  useEffect(() => dispose, [dispose])

  const load = useCallback(
    async (name: string, bytes: Uint8Array, options: { password?: string; edited?: boolean } = {}) => {
      const ticket = ++request.current
      try {
        const handle = await openPdfDocument(bytes, options.password)
        const pages = await readPageInfo(handle)
        if (ticket !== request.current) {
          void closePdfDocument(handle)
          return
        }
        dispose()
        current.current = handle
        setState({
          status: 'ready',
          doc: { id: crypto.randomUUID(), name, bytes, password: options.password, handle, pages, edited: options.edited ?? false },
        })
      } catch (error) {
        if (ticket !== request.current) return
        if (error instanceof PdfPasswordError) {
          dispose()
          setState({ status: 'locked', name, bytes, incorrect: options.password !== undefined, unlocking: false })
        } else {
          dispose()
          setState({ status: 'error', name })
        }
      }
    },
    [dispose],
  )

  const open = useCallback(
    async (file: File) => {
      setState({ status: 'opening', name: file.name })
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!looksLikePdf(bytes)) {
        request.current += 1
        dispose()
        setState({ status: 'error', name: file.name })
        return
      }
      await load(file.name, bytes)
    },
    [dispose, load],
  )

  const unlock = useCallback(
    async (password: string) => {
      if (state.status !== 'locked') return
      setState({ ...state, unlocking: true })
      await load(state.name, state.bytes, { password })
    },
    [load, state],
  )

  const close = useCallback(() => {
    request.current += 1
    dispose()
    setState({ status: 'empty' })
  }, [dispose])

  const adopt = useCallback(
    async (artifact: FileArtifact) => {
      const bytes = new Uint8Array(await artifact.blob.arrayBuffer())
      const password = artifact.preview.kind === 'pdfFile' ? artifact.preview.password : undefined
      setResults(null)
      await load(artifact.name, bytes, { password, edited: true })
    },
    [load],
  )

  return { state, open, unlock, close, adopt, results, showResults: setResults }
}
