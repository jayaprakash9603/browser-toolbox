import { extensionApi, isFirefoxRuntime } from './browser'

export type ExtensionCapability =
  | 'sidePanel'
  | 'sidebarAction'
  | 'offscreen'
  | 'userScripts'
  | 'userScriptExecution'
  | 'declarativeNetRequestFeedback'
  | 'debugger'
  | 'desktopCapture'
  | 'tabCapture'
  | 'devtools'

export function hasCapability(capability: ExtensionCapability): boolean {
  const api = extensionApi()
  if (!api) return false

  switch (capability) {
    case 'sidePanel':
      return Boolean(api.sidePanel?.open)
    case 'sidebarAction':
      return Boolean(api.sidebarAction?.open)
    case 'offscreen':
      return Boolean(api.offscreen?.createDocument)
    case 'userScripts':
      return Boolean(api.userScripts)
    case 'userScriptExecution':
      return Boolean(api.userScripts?.execute)
    case 'declarativeNetRequestFeedback':
      return Boolean(api.declarativeNetRequest?.onRuleMatchedDebug)
    case 'debugger':
      return Boolean(api.debugger)
    case 'desktopCapture':
      return Boolean(api.desktopCapture?.chooseDesktopMedia)
    case 'tabCapture':
      return Boolean(api.tabCapture?.getMediaStreamId)
    case 'devtools':
      return !isFirefoxRuntime() || Boolean(api.devtools)
  }
}

export function unsupportedCapabilities(): ExtensionCapability[] {
  return (
    [
      'sidePanel',
      'sidebarAction',
      'offscreen',
      'userScripts',
      'userScriptExecution',
      'declarativeNetRequestFeedback',
      'debugger',
      'desktopCapture',
      'tabCapture',
      'devtools',
    ] as const
  ).filter((capability) => !hasCapability(capability))
}

