import { useInsertionEffect } from 'react'
import postmanLiteCss from 'postman-lite/style.css?inline'

// postman-lite ships an unlayered Tailwind v3 preflight plus `*`, `:root`, `html` and `body`
// rules that restyle the whole document, and its HSL tokens only exist on <html> while the
// client is mounted. Keeping the sheet attached any longer breaks every toolbox border.
let mountCount = 0
let styleElement: HTMLStyleElement | null = null

export function usePostmanLiteStylesheet() {
  useInsertionEffect(() => {
    mountCount += 1
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.dataset.browserToolbox = 'postman-lite'
      styleElement.textContent = `${postmanLiteCss}

/* Keep embedded API client dialogs above the host panel and its overlay. */
html[data-browser-toolbox-api-client="open"] [data-radix-dialog-overlay][data-state="open"] {
  z-index: 9998 !important;
}

html[data-browser-toolbox-api-client="open"] [data-radix-dialog-content][data-state="open"] {
  z-index: 9999 !important;
}
`
      document.head.append(styleElement)
    }
    return () => {
      mountCount -= 1
      if (mountCount === 0) {
        styleElement?.remove()
        styleElement = null
      }
    }
  }, [])
}
