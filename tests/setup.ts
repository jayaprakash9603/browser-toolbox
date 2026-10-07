import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

import '@/i18n'

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
  commands: { onCommand: makeEvent() },
  action: { onClicked: makeEvent() },
  permissions: {
    contains: vi.fn(async () => false),
    request: vi.fn(async () => false),
    remove: vi.fn(async () => true),
  },
  tabs: { query: vi.fn(async () => []), sendMessage: vi.fn(async () => undefined) },
  i18n: {
    getMessage: (name: string) =>
      (
        {
          extName: 'Browser Toolbox',
          contextMenuOpen: 'Open Browser Toolbox',
        } as Record<string, string>
      )[name] ?? '',
  },
}

vi.stubGlobal('chrome', chromeMock)

export function resetChromeMockStorage() {
  storageData.clear()
}
