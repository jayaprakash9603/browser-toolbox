import type { CapturedField } from '@/core/form-memory/model'

import { forget } from './cache'
import { clearPass } from './clear'
import { collect, visible } from './collect'
import { RETRY_DELAYS_MS } from './constants'
import { isChecked } from './dom'
import { fillPass } from './fill'
import { matchPage, rememberedBy } from './match'
import { quietly } from './scope'
import { toast } from './toast'
import type { Entry, FormPageArgs, FormPageResult } from './types'
import { capture, hasValue } from './values'
import { watch } from './watch'

/** Single-page apps render some controls after the first pass; keep filling those a few times. */
function retryLate(args: FormPageArgs, done: Set<string>, first: number): void {
  const fields = args.fields ?? []
  const options = { overwrite: false, files: args.files }
  const pending = () => fields.some((field) => !done.has(field.key))
  if (!pending()) return
  let total = first
  const step = (index: number) => {
    window.setTimeout(
      () =>
        void quietly(() => fillPass(fields, [], options, done)).then((count) => {
          total += count
          if (index + 1 < RETRY_DELAYS_MS.length && pending()) step(index + 1)
          else if (total > first && args.late) {
            toast((total === 1 ? args.late.one : args.late.other).replace('{count}', String(total)), args.brand)
          }
        }),
      RETRY_DELAYS_MS[index] - (index > 0 ? RETRY_DELAYS_MS[index - 1] : 0),
    )
  }
  step(0)
}

/** Boxes left at their default say nothing about the user; only ticks and deliberate unticks count. */
function deliberate(entry: Entry): boolean {
  if (entry.kind !== 'checkbox') return true
  if (entry.widget) return isChecked(entry.widget.host)
  const box = entry.els[0] as HTMLInputElement
  return box.checked || box.checked !== box.defaultChecked
}

const nonEmpty = (field: CapturedField) => (Array.isArray(field.value) ? field.value.length > 0 : field.value !== '')

/** Runs one form-memory action in this frame and reports what the frame holds afterwards. */
export async function runFormMemoryPage(args: FormPageArgs): Promise<FormPageResult> {
  const result: FormPageResult = { ok: true, filled: 0, cleared: 0, total: 0, populated: 0, matched: 0 }
  try {
    if (args.watch) watch()
    if (args.notice) toast(args.notice, args.brand)
    const fields = args.fields ?? []
    const shared = args.shared ?? []
    if (args.action === 'fill') {
      const done = new Set<string>()
      const options = { overwrite: Boolean(args.overwrite), files: args.files }
      result.filled = await quietly(() => fillPass(fields, shared, options, done))
      if (args.retry) retryLate(args, done, result.filled)
    } else if (args.action === 'clear') {
      result.cleared = await quietly(() => clearPass(fields, shared))
    }
    const entries = collect().filter(visible)
    const remembered = rememberedBy(entries, fields, shared)
    result.total = entries.length
    result.populated = entries.filter((entry) => remembered(entry) && hasValue(entry)).length
    result.matched = matchPage(entries, fields).size
    if (args.action === 'snapshot') {
      result.fields = (await capture(entries.filter(deliberate))).filter(nonEmpty)
      result.populated = result.fields.length
    }
  } catch {
    result.ok = false
  } finally {
    // The page keeps its elements; this script should not keep them alive between runs.
    forget()
  }
  return result
}
