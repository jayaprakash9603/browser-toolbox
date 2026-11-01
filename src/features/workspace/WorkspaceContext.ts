import { createContext, useContext } from 'react'

export const WorkspaceContext = createContext<string | null>(null)

export function useWorkspaceId(): string | null {
  return useContext(WorkspaceContext)
}

/**
 * Right-hand slot of the workspace header. Child tools portal their actions
 * (info, star, more options) here so the workspace shows one header, not two.
 */
export const WorkspaceHeaderSlotContext = createContext<HTMLElement | null>(null)

export function useWorkspaceHeaderSlot(): HTMLElement | null {
  return useContext(WorkspaceHeaderSlotContext)
}
