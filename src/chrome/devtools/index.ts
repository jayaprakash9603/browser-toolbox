// DevTools entry point — placeholder for the future toolbox DevTools panel.
// Future tools (DOM inspector, XPath generator, CSS selector generator, network
// helpers) will register panels here via the tool registry.

chrome.devtools?.panels.create('Toolbox', '', 'index.html#/devtools', () => undefined)

export {}
