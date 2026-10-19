import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/globals.css'
import '@/i18n'

import { BlockedPage } from './BlockedPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BlockedPage />
  </StrictMode>,
)
