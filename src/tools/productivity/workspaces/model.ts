import { get, set } from '@/core/storage'

const STORAGE_KEY = 'toolbox.tabWorkspaces.v1'

export interface WorkspaceTab {
  url: string
  title?: string
}

export interface TabWorkspace {
  id: string
  name: string
  tabs: WorkspaceTab[]
  note?: string
  createdAt: number
  updatedAt: number
}

export async function loadWorkspaces(): Promise<TabWorkspace[]> {
  const list = await get<TabWorkspace[]>(STORAGE_KEY)
  return Array.isArray(list) ? list : []
}

export async function saveWorkspaces(workspaces: TabWorkspace[]): Promise<void> {
  await set(STORAGE_KEY, workspaces)
}

export function newWorkspace(name: string, tabs: WorkspaceTab[], note?: string): TabWorkspace {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled session',
    tabs,
    note: note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  }
}

export function filterWorkspaces(workspaces: TabWorkspace[], query: string): TabWorkspace[] {
  const q = query.trim().toLowerCase()
  if (!q) return workspaces
  return workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      (w.note?.toLowerCase().includes(q) ?? false) ||
      w.tabs.some((t) => t.url.toLowerCase().includes(q) || (t.title?.toLowerCase().includes(q) ?? false)),
  )
}
