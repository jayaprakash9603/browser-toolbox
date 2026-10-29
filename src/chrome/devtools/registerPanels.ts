/** Minimal DevTools bootstrap — keep free of app imports so sidebar panes always register. */

function extensionPage(hash: string): string {
  return `${chrome.runtime.getURL('index.html')}${hash.startsWith('#') ? hash : `#${hash}`}`
}

function registerElementsSidebar(title: string, hash: string, height = '420px'): void {
  const elements = chrome.devtools?.panels?.elements
  if (!elements?.createSidebarPane) {
    console.warn('[One Panel] Elements sidebar API is unavailable in this browser.')
    return
  }
  elements.createSidebarPane(title, (pane) => {
    pane.setPage(extensionPage(hash))
    pane.setHeight(height)
  })
}

chrome.devtools?.panels?.create('One Panel', '', extensionPage('#/devtools'), () => undefined)
chrome.devtools?.panels?.create('Interceptor', '', extensionPage('#/devtools/interceptor'), () => undefined)
registerElementsSidebar('Selector Studio', '#/devtools/selector-studio-sidebar')

export {}
