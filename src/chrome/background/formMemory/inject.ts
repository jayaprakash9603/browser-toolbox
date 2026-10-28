import type { FormMemoryPageScope, FormPageArgs, FormPageResult } from '@/chrome/content/formMemory/types'
import { getExtensionName } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'

const logger = createLogger('form-memory')

/** Built from src/chrome/content/formMemory/page.ts by scripts/build-adblock-scripts.mjs. */
export const FORM_MEMORY_PAGE_JS = 'form-memory/scripts/page.js'

type Target = chrome.scripting.InjectionTarget

/** Runs in the page after the script file, so it must stay self-contained. */
function callFormMemoryPage(args: FormPageArgs): Promise<FormPageResult | null> {
  const run = (window as unknown as FormMemoryPageScope).__tbxFormMemoryRun
  return run ? run(args) : Promise.resolve(null)
}

async function execute(target: Target, args: FormPageArgs): Promise<chrome.scripting.InjectionResult<FormPageResult | null>[]> {
  await chrome.scripting.executeScript({ target, files: [FORM_MEMORY_PAGE_JS] })
  return chrome.scripting.executeScript({ target, func: callFormMemoryPage, args: [args] })
}

function sum(results: chrome.scripting.InjectionResult<FormPageResult | null>[]): FormPageResult | null {
  const done = results.map((item) => item.result).filter((item): item is FormPageResult => Boolean(item?.ok))
  if (done.length === 0) return null
  return done.reduce(
    (acc, item) => ({
      ok: true,
      filled: acc.filled + item.filled,
      cleared: acc.cleared + item.cleared,
      total: acc.total + item.total,
      populated: acc.populated + item.populated,
      matched: acc.matched + item.matched,
      fields: item.fields ? [...(acc.fields ?? []), ...item.fields] : acc.fields,
    }),
    { ok: true, filled: 0, cleared: 0, total: 0, populated: 0, matched: 0 } as FormPageResult,
  )
}

/** Every frame we may script first; the top frame alone when a child frame refuses. */
export async function runInTab(tabId: number, args: FormPageArgs): Promise<FormPageResult | null> {
  try {
    return sum(await execute({ tabId, allFrames: true }, args))
  } catch {
    try {
      return sum(await execute({ tabId }, args))
    } catch (error) {
      logger.debug('page unavailable', error)
      return null
    }
  }
}

/** Shows a toast in the top frame of the tab. */
export function notify(tabId: number, notice: string): void {
  void execute({ tabId }, { action: 'inspect', notice, brand: getExtensionName() }).catch(() => undefined)
}
