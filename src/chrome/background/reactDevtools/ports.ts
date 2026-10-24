import {
  EXTENSION_BRIDGE_CONNECTION_DISCONNECTED,
  EXTENSION_BRIDGE_CONNECTION_READY,
} from '@/core/reactDevtools/constants'

type TabPorts = {
  extension: chrome.runtime.Port | null
  proxy: chrome.runtime.Port | null
  disconnectPipe: (() => void) | null
}

const portsByTab: Record<string, TabPorts> = {}

function registerTab(tabId: number) {
  const key = String(tabId)
  if (!portsByTab[key]) {
    portsByTab[key] = { extension: null, proxy: null, disconnectPipe: null }
  }
}

function sendBridgeConnectionMessage(
  port: chrome.runtime.Port,
  type: typeof EXTENSION_BRIDGE_CONNECTION_READY | typeof EXTENSION_BRIDGE_CONNECTION_DISCONNECTED,
) {
  try {
    port.postMessage({
      source: 'react-devtools-background',
      payload: { type },
    })
  } catch {
    /* port may be gone */
  }
}

function connectExtensionAndProxyPorts(
  extensionPort: chrome.runtime.Port,
  proxyPort: chrome.runtime.Port,
  tabId: number,
) {
  const key = String(tabId)
  const entry = portsByTab[key]
  if (entry.disconnectPipe) {
    throw new Error(`Attempted to connect already connected ports for tab ${tabId}`)
  }

  let didDisconnect = false

  const extensionPortMessageListener = (message: unknown) => {
    try {
      proxyPort.postMessage(message)
    } catch {
      disconnectListener()
    }
  }

  const proxyPortMessageListener = (message: unknown) => {
    try {
      extensionPort.postMessage(message)
    } catch {
      disconnectListener()
    }
  }

  const disconnectListener = () => {
    if (didDisconnect) return
    didDisconnect = true
    extensionPort.onMessage.removeListener(extensionPortMessageListener)
    proxyPort.onMessage.removeListener(proxyPortMessageListener)
    sendBridgeConnectionMessage(extensionPort, EXTENSION_BRIDGE_CONNECTION_DISCONNECTED)
    sendBridgeConnectionMessage(proxyPort, EXTENSION_BRIDGE_CONNECTION_DISCONNECTED)
    entry.disconnectPipe = null
  }

  entry.disconnectPipe = disconnectListener

  extensionPort.onMessage.addListener(extensionPortMessageListener)
  proxyPort.onMessage.addListener(proxyPortMessageListener)
  extensionPort.onDisconnect.addListener(disconnectListener)
  proxyPort.onDisconnect.addListener(disconnectListener)

  sendBridgeConnectionMessage(proxyPort, EXTENSION_BRIDGE_CONNECTION_READY)
}

function registerExtensionPort(port: chrome.runtime.Port, tabId: number) {
  const key = String(tabId)
  portsByTab[key].extension = port
  port.onDisconnect.addListener(() => {
    portsByTab[key].disconnectPipe?.()
    portsByTab[key].extension = null
  })
}

function registerProxyPort(port: chrome.runtime.Port, tabId: string) {
  const entry = portsByTab[tabId]
  if (entry.proxy) {
    entry.disconnectPipe?.()
    try {
      entry.proxy.disconnect()
    } catch {
      /* ignore */
    }
  }
  entry.proxy = port
  port.onDisconnect.addListener(() => {
    entry.disconnectPipe?.()
    entry.proxy = null
  })
}

function isNumericPortName(name: string): boolean {
  return /^\d+$/.test(name)
}

export function connectReactDevtoolsPort(port: chrome.runtime.Port): void {
  if (port.name === 'proxy') {
    const tabId = port.sender?.tab?.id
    if (tabId == null) return
    const key = String(tabId)
    registerTab(tabId)
    registerProxyPort(port, key)
    if (portsByTab[key].extension) {
      connectExtensionAndProxyPorts(portsByTab[key].extension!, port, tabId)
    }
    return
  }

  if (isNumericPortName(port.name)) {
    const tabId = Number(port.name)
    registerTab(tabId)
    registerExtensionPort(port, tabId)
    const key = String(tabId)
    if (portsByTab[key].proxy) {
      connectExtensionAndProxyPorts(port, portsByTab[key].proxy!, tabId)
    }
  }
}

export function onReactDevtoolsTabActivated(activeTabId: number): void {
  for (const tabId in portsByTab) {
    const entry = portsByTab[tabId]
    if (entry.proxy == null || entry.extension == null) continue
    const event = Number(tabId) === activeTabId ? 'resumeElementPolling' : 'pauseElementPolling'
    try {
      entry.extension.postMessage({ event })
    } catch {
      /* ignore */
    }
  }
}
