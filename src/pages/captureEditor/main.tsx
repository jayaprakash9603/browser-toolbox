import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/globals.css'
import '@/i18n'

import { CaptureEditorApp } from '@/features/captureEditor/CaptureEditorApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaptureEditorApp />
  </StrictMode>,
)
