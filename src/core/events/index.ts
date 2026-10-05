export interface ToolboxEventMap {
  TOOL_OPENED: { toolId: string }
  TOOL_FAVORITED: { toolId: string; favorited: boolean }
  CLIPBOARD_UPDATED: { entryId: string }
  OPEN_TOOL: { toolId: string }
  OPEN_COMMAND_PALETTE: Record<string, never>
  CLEAR_DATA: { scope: 'clipboardHistory' | 'recentTools' | 'all' }
}

type Handler<T> = (payload: T) => void

class EventBus {
  private handlers = new Map<keyof ToolboxEventMap, Set<Handler<never>>>()

  on<K extends keyof ToolboxEventMap>(type: K, handler: Handler<ToolboxEventMap[K]>): () => void {
    const set = this.handlers.get(type) ?? new Set()
    set.add(handler as Handler<never>)
    this.handlers.set(type, set)
    return () => set.delete(handler as Handler<never>)
  }

  emit<K extends keyof ToolboxEventMap>(type: K, payload: ToolboxEventMap[K]) {
    this.handlers.get(type)?.forEach((handler) => (handler as Handler<ToolboxEventMap[K]>)(payload))
  }
}

export const eventBus = new EventBus()
