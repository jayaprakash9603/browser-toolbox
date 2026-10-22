import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/globals.css'
import '@/i18n'

import { RecordingViewer } from '@/features/recorder/RecordingViewer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecordingViewer />
  </StrictMode>,
)
