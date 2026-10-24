import '@/i18n'

import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import { AtomIcon, AlertTriangleIcon } from 'lucide-react'

import { STORAGE_KEYS } from '@/core/constants'
import type { ReactDevtoolsState } from '@/core/reactDevtools/state'
import type { Settings } from '@/features/settings/settingsService'
import { resolveBrowserThemeFromSettings } from '@/core/reactDevtools/theme'

import '@/chrome/devtools/react-devtools-theme.css'

type NoticeKind = 'no-react' | 'disabled' | 'reload' | 'conflict' | null

declare global {
  interface Window {
    container?: HTMLElement
    injectStyles?: (getLinkTags: () => HTMLLinkElement[]) => void
  }
}

const container = document.getElementById('container')
if (container) {
  window.container = container
}

let stylesInjected = false
window.injectStyles = (getLinkTags) => {
  if (stylesInjected) return
  stylesInjected = true
  for (const link of getLinkTags()) {
    document.head.appendChild(link)
  }
}

function applyTheme(settings: Settings | undefined, devtoolsTheme?: string) {
  const resolved = settings
    ? resolveBrowserThemeFromSettings(settings, devtoolsTheme)
    : devtoolsTheme === 'dark'
      ? 'dark'
      : 'light'
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  if (settings?.palette) document.documentElement.dataset.palette = settings.palette
  if (settings?.density) document.documentElement.dataset.density = settings.density
}

function Notice({ kind }: { kind: NoticeKind }) {
  const { t } = useTranslation()
  if (!kind) return null
  const copy = {
    'no-react': {
      title: t('reactDevtools.noticeNoReactTitle'),
      body: t('reactDevtools.noticeNoReactBody'),
    },
    disabled: {
      title: t('reactDevtools.noticeDisabledTitle'),
      body: t('reactDevtools.noticeDisabledBody'),
    },
    reload: {
      title: t('reactDevtools.noticeReloadTitle'),
      body: t('reactDevtools.noticeReloadBody'),
    },
    conflict: {
      title: t('reactDevtools.noticeConflictTitle'),
      body: t('reactDevtools.noticeConflictBody'),
    },
  }[kind]

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
      role="status"
    >
      {kind === 'conflict' ? (
        <AlertTriangleIcon className="size-10 text-warning" />
      ) : (
        <AtomIcon className="size-10 text-primary" />
      )}
      <h2 className="text-section-title">{copy.title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{copy.body}</p>
    </div>
  )
}

function readInitialNotice(): NoticeKind {
  const host = document.getElementById('container')
  const value = host?.getAttribute('data-bt-notice')
  if (value === 'no-react' || value === 'disabled' || value === 'reload' || value === 'conflict') {
    return value
  }
  return null
}

function PanelShell() {
  const [notice, setNotice] = useState<NoticeKind>(readInitialNotice)

  useEffect(() => {
    void (async () => {
      const bag = await chrome.storage.local.get([STORAGE_KEYS.settings, STORAGE_KEYS.reactDevtools])
      const settings = bag[STORAGE_KEYS.settings] as Settings | undefined
      const reactState = bag[STORAGE_KEYS.reactDevtools] as ReactDevtoolsState | undefined
      applyTheme(settings, chrome.devtools?.panels?.themeName)
      if (reactState?.enabled === false) {
        setNotice('disabled')
      }
    })()

    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<NoticeKind>).detail
      setNotice(detail)
    }
    const host = window.container ?? document.getElementById('container')
    host?.addEventListener('bt-react-devtools-notice', onNotice)

    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local') return
      if (STORAGE_KEYS.settings in changes) {
        const next = changes[STORAGE_KEYS.settings].newValue as Settings | undefined
        applyTheme(next, chrome.devtools?.panels?.themeName)
      }
      if (STORAGE_KEYS.reactDevtools in changes) {
        const next = changes[STORAGE_KEYS.reactDevtools].newValue as ReactDevtoolsState | undefined
        if (next?.enabled === false) setNotice('disabled')
      }
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => {
      host?.removeEventListener('bt-react-devtools-notice', onNotice)
      chrome.storage.onChanged.removeListener(onStorage)
    }
  }, [])

  if (notice) {
    return <Notice kind={notice} />
  }

  return null
}

const noticeRoot = document.getElementById('notice-root')
if (noticeRoot) {
  createRoot(noticeRoot).render(<PanelShell />)
}

export { PanelShell }
