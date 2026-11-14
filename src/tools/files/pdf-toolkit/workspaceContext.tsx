import { createContext, useContext } from 'react'

export type PdfToolkitWorkspaceBridge = {
  /** Saves open PDF, active tool tab, and any panel drafts before opening another extension tab. */
  flushAll: () => Promise<void>
  registerScanFlush: (flush: (() => Promise<void>) | null) => void
}

export const PdfToolkitWorkspaceContext = createContext<PdfToolkitWorkspaceBridge | null>(null)

export function usePdfToolkitWorkspace(): PdfToolkitWorkspaceBridge | null {
  return useContext(PdfToolkitWorkspaceContext)
}