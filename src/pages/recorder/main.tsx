import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/globals.css'
import '@/i18n'

import { RecorderWindow } from '@/features/recorder/RecorderWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RecorderWindow />
  </StrictMode>,
)
