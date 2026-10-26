import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

import '@/i18n'

class ResizeObserverMock {
  observe() {
    return undefined
  }
  unobserve() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock('postman-lite', () => ({
  default: () => null,
  defaultTheme: {
    light: {
      background: '0 0% 100%',
      foreground: '0 0% 0%',
      primary: '0 0% 0%',
      ring: '0 0% 0%',
      link: '0 0% 0%',
      accentSoft: '0 0% 95%',
      accentBorder: '0 0% 85%',
    },
    dark: {
      background: '0 0% 0%',
      foreground: '0 0% 100%',
      primary: '0 0% 100%',
      ring: '0 0% 100%',
      link: '0 0% 100%',
      accentSoft: '0 0% 15%',
      accentBorder: '0 0% 25%',
    },
  },
  createDefaultI18n: () => ({}),
  createExtensionAdapters: () => ({}),
  registerExtensionHistoryListener: vi.fn(),
  shadcnKit: {},
}))

vi.mock('postman-lite/style.css', () => ({}))

function makeEvent() {
  return {
    addListener: (_fn: (...args: unknown[]) => void) => undefined,
    removeListener: () => undefined,
    hasListener: () => false,
  }
}

const storageData = new Map<string, unknown>()

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | null) => {
        if (keys == null) return Object.fromEntries(storageData)
        const list = Array.isArray(keys) ? keys : [keys]
        return Object.fromEntries(
          list.filter((k) => storageData.has(k)).map((k) => [k, storageData.get(k)]),
        )
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.entries(items).forEach(([k, v]) => storageData.set(k, v))
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        ;(Array.isArray(keys) ? keys : [keys]).forEach((k) => storageData.delete(k))
      }),
      clear: vi.fn(async () => storageData.clear()),
      onChanged: makeEvent(),
    },
    session: {
      get: vi.fn(async (keys?: string | string[] | null) => {
        if (keys == null) return Object.fromEntries(storageData)
        const list = Array.isArray(keys) ? keys : [keys]
        return Object.fromEntries(
          list.filter((k) => storageData.has(k)).map((k) => [k, storageData.get(k)]),
        )
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.entries(items).forEach(([k, v]) => storageData.set(k, v))
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        ;(Array.isArray(keys) ? keys : [keys]).forEach((k) => storageData.delete(k))
      }),
      clear: vi.fn(async () => storageData.clear()),
      onChanged: makeEvent(),
    },
    onChanged: makeEvent(),
  },
  runtime: {
    onMessage: makeEvent(),
    sendMessage: vi.fn(async () => undefined),
    lastError: undefined,
    getURL: (path: string) => path,
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn(async () => undefined),
    onClicked: makeEvent(),
  },
  sidePanel: { setPanelBehavior: vi.fn(async () => undefined), open: vi.fn(async () => undefined) },
  commands: {
    onCommand: makeEvent(),
    getAll: vi.fn(async () => [{ name: 'toggle-pip', shortcut: 'Alt+P' }]),
    update: vi.fn(async () => undefined),
  },
  action: {
    onClicked: makeEvent(),
    setBadgeText: vi.fn(async () => undefined),
    setBadgeBackgroundColor: vi.fn(async () => undefined),
  },
  permissions: {
    contains: vi.fn(async () => false),
    request: vi.fn(async () => false),
    remove: vi.fn(async () => true),
  },
  tabs: {
    query: vi.fn(async () => [{ id: 1, url: 'https://example.com', active: true }]),
    sendMessage: vi.fn(async () => undefined),
    reload: vi.fn(async () => undefined),
    get: vi.fn(async (id: number) => ({ id, url: 'https://example.com' })),
    create: vi.fn(async () => undefined),
  },
  notifications: {
    create: vi.fn(async () => undefined),
  },
  scripting: {
    registerContentScripts: vi.fn(async () => undefined),
    unregisterContentScripts: vi.fn(async () => undefined),
    executeScript: vi.fn(async () => undefined),
    insertCSS: vi.fn(async () => undefined),
    getRegisteredContentScripts: vi.fn(async () => []),
  },
  alarms: {
    create: vi.fn(async () => undefined),
    clear: vi.fn(async () => true),
    get: vi.fn(async (_name?: string) => undefined as chrome.alarms.Alarm | undefined),
    onAlarm: makeEvent(),
  },
  declarativeNetRequest: {
    updateEnabledRulesets: vi.fn(async () => undefined),
    updateDynamicRules: vi.fn(async () => undefined),
    getDynamicRules: vi.fn(async () => []),
    getSessionRules: vi.fn(async () => []),
    updateSessionRules: vi.fn(async () => undefined),
    getMatchedRules: vi.fn(async () => ({ rulesMatchedInfo: [] })),
    setExtensionActionOptions: vi.fn(async () => undefined),
  },
  windows: {
    getLastFocused: vi.fn(async () => ({ tabs: [] })),
    getAll: vi.fn(async () => []),
  },
  i18n: {
    getMessage: (name: string) =>
      (
        {
          extName: 'One Panel',
          contextMenuOpen: 'Open One Panel',
        } as Record<string, string>
      )[name] ?? '',
  },
}

vi.stubGlobal('chrome', chromeMock)

export function resetChromeMockStorage() {
  storageData.clear()
}
