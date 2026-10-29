// DevTools entry point — placeholder for the future toolbox DevTools panel.
// Future tools (DOM inspector, XPath generator, CSS selector generator, network
// helpers) will register panels here via the tool registry.

chrome.devtools?.panels.create('One Panel', '', 'index.html#/devtools', () => undefined)
chrome.devtools?.panels.create('Interceptor', '', 'index.html#/devtools/interceptor', () => undefined)
chrome.devtools?.panels.create(
  'Selector Studio',
  'icons/icon32.png',
  'index.html#/devtools/selector-studio',
  () => undefined,
)
chrome.devtools?.panels.elements.createSidebarPane('Selector Studio', (pane) => {
  pane.setPage('index.html#/devtools/selector-studio-sidebar')
  pane.setHeight('420px')
})

export {}
