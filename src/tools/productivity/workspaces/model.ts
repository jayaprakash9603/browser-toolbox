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
  tags?: string[]
  pinned?: boolean
  createdAt: number
  updatedAt: number
}

export type WorkspaceSort = 'recent' | 'name' | 'tabs'

export async function loadWorkspaces(): Promise<TabWorkspace[]> {
  const list = await get<TabWorkspace[]>(STORAGE_KEY)
  return Array.isArray(list) ? list : []
}

export async function saveWorkspaces(workspaces: TabWorkspace[]): Promise<void> {
  await set(STORAGE_KEY, workspaces)
}

export function parseWorkspaceTags(input: string): string[] {
  const seen = new Set<string>()
  for (const part of input.split(/[\s,]+/)) {
    const clean = part.replace(/^#+/, '').trim().toLowerCase()
    if (clean) seen.add(clean)
  }
  return [...seen]
}

export function newWorkspace(name: string, tabs: WorkspaceTab[], note?: string, tags: string[] = []): TabWorkspace {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled session',
    tabs,
    note: note?.trim() || undefined,
    tags: tags.length ? tags : undefined,
    createdAt: now,
    updatedAt: now,
  }
}

export function filterWorkspaces(workspaces: TabWorkspace[], query: string, tag: string | 'all' = 'all'): TabWorkspace[] {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  return workspaces.filter((w) => {
    if (tag !== 'all' && !(w.tags ?? []).includes(tag)) return false
    if (!q) return true
    return (
      w.name.toLowerCase().includes(q) ||
      (w.note?.toLowerCase().includes(q) ?? false) ||
      (w.tags ?? []).some((t) => t.includes(q)) ||
      w.tabs.some((t) => t.url.toLowerCase().includes(q) || (t.title?.toLowerCase().includes(q) ?? false))
    )
  })
}

export function sortWorkspaces(workspaces: TabWorkspace[], sort: WorkspaceSort): TabWorkspace[] {
  const compare = (a: TabWorkspace, b: TabWorkspace) => {
    if (sort === 'name') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    if (sort === 'tabs') return b.tabs.length - a.tabs.length || b.updatedAt - a.updatedAt
    return b.updatedAt - a.updatedAt
  }
  const pinned = workspaces.filter((w) => w.pinned).sort(compare)
  const rest = workspaces.filter((w) => !w.pinned).sort(compare)
  return [...pinned, ...rest]
}

export function workspaceTags(workspaces: readonly TabWorkspace[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const w of workspaces) {
    for (const tag of w.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }))
}

export function dedupeTabs(tabs: readonly WorkspaceTab[]): WorkspaceTab[] {
  const seen = new Set<string>()
  const result: WorkspaceTab[] = []
  for (const tab of tabs) {
    const key = tab.url.replace(/#.*$/, '').replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tab)
  }
  return result
}

export function countDuplicateTabs(tabs: readonly WorkspaceTab[]): number {
  return tabs.length - dedupeTabs(tabs).length
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function workspaceToMarkdown(workspace: TabWorkspace): string {
  const heading = `## ${workspace.name}`
  const note = workspace.note ? `\n> ${workspace.note.replace(/\n+/g, ' ')}\n` : ''
  const links = workspace.tabs.map((tab) => `- [${tab.title || tab.url}](${tab.url})`).join('\n')
  return `${heading}\n${note}\n${links}`
}

export function workspacesToMarkdown(workspaces: readonly TabWorkspace[]): string {
  return workspaces.map(workspaceToMarkdown).join('\n\n')
}

export function mergeImportedWorkspaces(existing: TabWorkspace[], imported: unknown): TabWorkspace[] {
  const rows = Array.isArray(imported) ? imported : [imported]
  const ids = new Set(existing.map((w) => w.id))
  const merged = [...existing]
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const candidate = row as Partial<TabWorkspace>
    if (!Array.isArray(candidate.tabs) || !candidate.tabs.length) continue
    const tabs = candidate.tabs.filter((tab): tab is WorkspaceTab => typeof tab?.url === 'string' && tab.url.length > 0)
    if (!tabs.length) continue
    const now = Date.now()
    const id = candidate.id && !ids.has(candidate.id) ? candidate.id : crypto.randomUUID()
    ids.add(id)
    merged.push({
      id,
      name: candidate.name?.trim() || 'Imported session',
      tabs,
      note: candidate.note,
      tags: Array.isArray(candidate.tags) ? candidate.tags : undefined,
      pinned: candidate.pinned,
      createdAt: candidate.createdAt ?? now,
      updatedAt: now,
    })
  }
  return merged
}
