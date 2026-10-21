export * from './types'
export * from './detect'
export * from './columns'
export {
  cssPathFromRoot,
  generalizeRowSelector,
  isStableClass,
  isUniqueSelector,
  relativeSelector,
  segmentSelector,
  stableClasses,
} from './selector'
export * from './pagination'
export * from './dedupe'
export * from './jobRunner'
export * from './export/csv'
export * from './export/tsv'
export * from './export/json'
export * from './export/xlsx'

export const SCRAPER_PICK_KEY = 'toolbox.scraperPick'
export const SCRAPER_JOB_KEY_PREFIX = 'toolbox.scraperJob.'

export function scraperJobKey(tabId: number): string {
  return `${SCRAPER_JOB_KEY_PREFIX}${tabId}`
}
