import { createContext, useContext } from 'react'

export const WorkspaceContext = createContext<string | null>(null)

export function useWorkspaceId(): string | null {
  return useContext(WorkspaceContext)
}
