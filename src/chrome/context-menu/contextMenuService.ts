export interface ContextMenuAction {
  id: string
  title: string
  contexts: chrome.contextMenus.ContextType[]
  toolId?: string
  enabled: boolean
}

const actions = new Map<string, ContextMenuAction>()

export function registerContextMenuAction(action: ContextMenuAction) {
  actions.set(action.id, action)
}

export function getContextMenuActions(): ContextMenuAction[] {
  return [...actions.values()].filter((action) => action.enabled)
}
