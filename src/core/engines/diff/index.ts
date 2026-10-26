import { diffLines, diffWordsWithSpace, type Change } from 'diff'

export * from './aligned'

export type DiffGranularity = 'lines' | 'words'

export interface DiffResult {
  changes: Change[]
  added: number
  removed: number
  unchanged: number
}

export function compareText(a: string, b: string, granularity: DiffGranularity): DiffResult {
  const changes = granularity === 'lines' ? diffLines(a, b) : diffWordsWithSpace(a, b)
  return {
    changes,
    added: changes.filter((change) => change.added).length,
    removed: changes.filter((change) => change.removed).length,
    unchanged: changes.filter((change) => !change.added && !change.removed).length,
  }
}
