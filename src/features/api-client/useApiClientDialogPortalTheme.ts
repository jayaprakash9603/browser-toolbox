import { useEffect } from 'react'

const PORTAL_DATASET_KEY = 'browserToolboxApiClientPortal'
const PORTAL_SELECTOR = '[data-browser-toolbox-api-client-portal="themed"]'

function copyThemeHostStyles(from: HTMLElement, to: HTMLElement): void {
  to.classList.toggle('dark', from.classList.contains('dark'))
  for (let i = 0; i < from.style.length; i += 1) {
    const name = from.style.item(i)
    if (name.startsWith('--')) {
      to.style.setProperty(name, from.style.getPropertyValue(name))
    }
  }
}

function isPostmanLiteDialogContent(node: Element): boolean {
  if (!node.matches('[data-radix-dialog-content]')) return false
  if (node.closest('.api-client-theme-host')) return false
  return getComputedStyle(node).zIndex === '9999'
}

/** Radix dialogs portal to <body>, outside `.api-client-theme-host`, so postman-lite tokens and utilities never apply. */
function syncPostmanLiteDialogPortals(): void {
  if (document.documentElement.dataset.browserToolboxApiClient !== 'open') return

  const host = document.querySelector<HTMLElement>('.api-client-theme-host')
  if (!host) return

  for (const content of document.querySelectorAll<HTMLElement>('[data-radix-dialog-content]')) {
    if (!isPostmanLiteDialogContent(content)) continue
    const portal = content.parentElement
    if (!portal) continue
    portal.dataset[PORTAL_DATASET_KEY] = 'themed'
    portal.classList.add('api-client-theme-host')
    copyThemeHostStyles(host, portal)
  }
}

export function useApiClientDialogPortalTheme(): void {
  useEffect(() => {
    syncPostmanLiteDialogPortals()

    const host = document.querySelector<HTMLElement>('.api-client-theme-host')
    const hostObserver =
      host &&
      new MutationObserver(() => {
        syncPostmanLiteDialogPortals()
      })

    if (host) {
      hostObserver?.observe(host, { attributes: true, attributeFilter: ['style', 'class'] })
    }

    const bodyObserver = new MutationObserver(() => {
      syncPostmanLiteDialogPortals()
    })
    bodyObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      hostObserver?.disconnect()
      bodyObserver.disconnect()
      for (const portal of document.querySelectorAll<HTMLElement>(PORTAL_SELECTOR)) {
        delete portal.dataset[PORTAL_DATASET_KEY]
        portal.classList.remove('api-client-theme-host', 'dark')
        portal.removeAttribute('style')
      }
    }
  }, [])
}
