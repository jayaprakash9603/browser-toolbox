/* Injected before app load — minimal chrome API for preview screenshots. */
(function () {
  const storageData = new Map()

  function makeEvent() {
    return {
      addListener() {},
      removeListener() {},
      hasListener() {
        return false
      },
    }
  }

  const chrome = {
    storage: {
      local: {
        get: async (keys) => {
          if (keys == null) return Object.fromEntries(storageData)
          const list = Array.isArray(keys) ? keys : [keys]
          return Object.fromEntries(list.filter((k) => storageData.has(k)).map((k) => [k, storageData.get(k)]))
        },
        set: async (items) => {
          Object.entries(items).forEach(([k, v]) => storageData.set(k, v))
        },
        remove: async (keys) => {
          ;(Array.isArray(keys) ? keys : [keys]).forEach((k) => storageData.delete(k))
        },
        clear: async () => storageData.clear(),
        onChanged: makeEvent(),
      },
      session: {
        get: async (keys) => {
          if (keys == null) return Object.fromEntries(storageData)
          const list = Array.isArray(keys) ? keys : [keys]
          return Object.fromEntries(list.filter((k) => storageData.has(k)).map((k) => [k, storageData.get(k)]))
        },
        set: async (items) => {
          Object.entries(items).forEach(([k, v]) => storageData.set(k, v))
        },
        remove: async () => {},
        clear: async () => {},
        onChanged: makeEvent(),
      },
      onChanged: makeEvent(),
    },
    runtime: {
      onMessage: makeEvent(),
      sendMessage: async () => undefined,
      lastError: undefined,
      getURL: (path) => path,
      id: 'store-screenshot-mock',
    },
    contextMenus: { create() {}, removeAll: async () => {}, onClicked: makeEvent() },
    sidePanel: { setPanelBehavior: async () => {}, open: async () => {} },
    commands: {
      onCommand: makeEvent(),
      getAll: async () => [{ name: 'open-command-palette', shortcut: 'Ctrl+Shift+Space' }],
    },
    action: {
      onClicked: makeEvent(),
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {},
    },
    permissions: {
      contains: async () => false,
      request: async () => false,
      remove: async () => true,
    },
    tabs: {
      query: async () => [{ id: 1, url: 'https://example.com', active: true, title: 'Example' }],
      sendMessage: async () => undefined,
      reload: async () => undefined,
      get: async (id) => ({ id, url: 'https://example.com', title: 'Example' }),
      create: async () => undefined,
    },
    notifications: { create: async () => undefined },
    scripting: {
      registerContentScripts: async () => undefined,
      unregisterContentScripts: async () => undefined,
      executeScript: async () => undefined,
      insertCSS: async () => undefined,
      getRegisteredContentScripts: async () => [],
    },
    alarms: {
      create: async () => undefined,
      clear: async () => true,
      get: async () => undefined,
      onAlarm: makeEvent(),
    },
    declarativeNetRequest: {
      updateEnabledRulesets: async () => undefined,
      updateDynamicRules: async () => undefined,
      getDynamicRules: async () => [],
      getSessionRules: async () => [],
      updateSessionRules: async () => undefined,
      getMatchedRules: async () => ({ rulesMatchedInfo: [] }),
      setExtensionActionOptions: async () => undefined,
    },
    windows: {
      getLastFocused: async () => ({ tabs: [] }),
      getAll: async () => [],
    },
    i18n: {
      getMessage: (name) =>
        ({ extName: 'One Panel', contextMenuOpen: 'Open One Panel' })[name] ?? '',
    },
  }

  globalThis.chrome = chrome
})()
