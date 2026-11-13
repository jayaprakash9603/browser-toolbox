import type { BookmarkWorkspace } from './model'

export function snapshotWorkspace(workspace: BookmarkWorkspace): BookmarkWorkspace {
  return structuredClone(workspace)
}

export function mergeNotes(keeper: string, extra: string): string {
  const parts = [keeper.trim(), extra.trim()].filter(Boolean)
  return [...new Set(parts)].join('\n\n')
}

export function mergeIdLists(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])]
}
