import {
  FORM_AUTOFILL_ROUTE,
  applyCapture,
  isHostBlocked,
  markPageFilled,
  pageRefFor,
  planFill,
  type CapturedField,
  type FormActionResult,
} from '@/core/form-memory/model'
import { loadFormMemory, updateFormMemory } from '@/core/form-memory/storage'
import { getActiveWebTab } from '@/chrome/contentScriptClient'
import { getChromeMessage, getExtensionName } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { runFormMemoryPage, type FormPageArgs, type FormPageResult } from './page'

const logger = createLogger('form-memory')

export type FormActionSource = 'shortcut' | 'panel' | 'auto'

const EMPTY: Omit<FormActionResult, 'ok'> = {
  filled: 0,
  cleared: 0,
  total: 0,
  populated: 0,
  matched: 0,
  saved: 0,
  shared: 0,
  learn: true,
}

function scriptable(url: string | undefined): url is string {
  return Boolean(url && /^(https?|file):/i.test(url) && !isRestrictedCaptureUrl(url))
}

async function resolveTab(tab?: chrome.tabs.Tab, tabId?: number): Promise<chrome.tabs.Tab | undefined> {
  if (tabId != null) return chrome.tabs.get(tabId).catch(() => undefined)
  if (tab?.id != null && tab.url) return tab
  return (await getActiveWebTab()) ?? tab
}

function sum(results: chrome.scripting.InjectionResult<FormPageResult>[]): FormPageResult | null {
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
async function runInTab(tabId: number, args: FormPageArgs): Promise<FormPageResult | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: runFormMemoryPage,
      args: [args],
    })
    return sum(results)
  } catch {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: runFormMemoryPage,
        args: [args],
      })
      return sum(results)
    } catch (error) {
      logger.debug('page unavailable', error)
      return null
    }
  }
}

function notify(tabId: number, notice: string): void {
  void chrome.scripting
    .executeScript({
      target: { tabId },
      func: runFormMemoryPage,
      args: [{ action: 'inspect', notice, brand: getExtensionName() }],
    })
    .catch(() => undefined)
}

function filledText(count: number): string {
  return count === 1
    ? getChromeMessage('formFilledOne')
    : getChromeMessage('formFilledOther').replace('{count}', String(count))
}

async function openPanelFallback(windowId: number | undefined): Promise<void> {
  const intent = setPanelRouteIntent(FORM_AUTOFILL_ROUTE)
  if (windowId != null) await chrome.sidePanel.open({ windowId }).catch(() => undefined)
  await intent
}

export async function fillFormInTab(
  source: FormActionSource,
  tab?: chrome.tabs.Tab,
  tabId?: number,
): Promise<FormActionResult> {
  const target = await resolveTab(tab, tabId)
  if (target?.id == null) return { ok: false, reason: 'no-tab', ...EMPTY }
  if (!scriptable(target.url)) {
    if (source === 'shortcut') await openPanelFallback(target.windowId)
    return { ok: false, reason: 'restricted', ...EMPTY, url: target.url }
  }
  const state = await loadFormMemory()
  const ref = pageRefFor(target.url)
  const blocked = ref ? isHostBlocked(state.settings, ref.host) : false
  const plan = planFill(state, target.url, source !== 'auto')
  const base = {
    ...EMPTY,
    saved: plan.page.length,
    shared: plan.shared.length,
    learn: state.settings.learn,
    url: target.url,
  }
  if (blocked) {
    return { ok: false, reason: 'blocked', ...base }
  }
  const late = { one: getChromeMessage('formFilledOne'), other: getChromeMessage('formFilledOther') }
  const page = await runInTab(target.id, {
    action: 'fill',
    fields: plan.page,
    shared: plan.shared,
    overwrite: source !== 'auto',
    retry: source === 'auto',
    watch: state.settings.learn,
    brand: getExtensionName(),
    late,
  })
  if (!page) {
    if (source === 'shortcut') await openPanelFallback(target.windowId)
    return { ok: false, reason: 'no-access', ...base }
  }
  if (page.filled > 0 && plan.pageId) {
    const pageId = plan.pageId
    void updateFormMemory((current) => markPageFilled(current, pageId, Date.now()))
  }
  if (source === 'shortcut' || (source === 'auto' && page.filled > 0)) {
    const notice =
      page.filled > 0
        ? filledText(page.filled)
        : plan.page.length + plan.shared.length === 0
          ? getChromeMessage('formNothingSaved')
          : getChromeMessage('formAlreadyFilled')
    notify(target.id, notice)
  }
  return { ok: true, ...base, ...pick(page) }
}

function pick(page: FormPageResult) {
  return {
    filled: page.filled,
    cleared: page.cleared,
    total: page.total,
    populated: page.populated,
    matched: page.matched,
  }
}

export async function clearFormInTab(
  source: FormActionSource,
  tab?: chrome.tabs.Tab,
  tabId?: number,
): Promise<FormActionResult> {
  const target = await resolveTab(tab, tabId)
  if (target?.id == null) return { ok: false, reason: 'no-tab', ...EMPTY }
  if (!scriptable(target.url)) {
    if (source === 'shortcut') await openPanelFallback(target.windowId)
    return { ok: false, reason: 'restricted', ...EMPTY, url: target.url }
  }
  const state = await loadFormMemory()
  const plan = planFill(state, target.url, false)
  const page = await runInTab(target.id, { action: 'clear', fields: plan.page, watch: state.settings.learn })
  const base = { ...EMPTY, saved: plan.page.length, learn: state.settings.learn, url: target.url }
  if (!page) {
    if (source === 'shortcut') await openPanelFallback(target.windowId)
    return { ok: false, reason: 'no-access', ...base }
  }
  if (source === 'shortcut') {
    notify(
      target.id,
      page.cleared > 0
        ? getChromeMessage('formCleared').replace('{count}', String(page.cleared))
        : getChromeMessage('formNothingToClear'),
    )
  }
  return { ok: true, ...base, ...pick(page) }
}

async function inspectTab(tabId?: number): Promise<FormActionResult> {
  const target = await resolveTab(undefined, tabId)
  if (target?.id == null) return { ok: false, reason: 'no-tab', ...EMPTY }
  if (!scriptable(target.url)) return { ok: false, reason: 'restricted', ...EMPTY, url: target.url }
  const state = await loadFormMemory()
  const ref = pageRefFor(target.url)
  const plan = planFill(state, target.url, true)
  const base = {
    ...EMPTY,
    saved: plan.page.length,
    shared: plan.shared.length,
    learn: state.settings.learn,
    url: target.url,
  }
  if (ref && isHostBlocked(state.settings, ref.host)) return { ok: true, reason: 'blocked', ...base }
  const page = await runInTab(target.id, { action: 'inspect', fields: plan.page, watch: state.settings.learn })
  if (!page) return { ok: false, reason: 'no-access', ...base }
  return { ok: true, ...base, ...pick(page) }
}

/** "Remember this page now": stores every value currently on the page, typed by the user or not. */
async function saveTab(tabId?: number): Promise<FormActionResult> {
  const target = await resolveTab(undefined, tabId)
  if (target?.id == null) return { ok: false, reason: 'no-tab', ...EMPTY }
  if (!scriptable(target.url)) return { ok: false, reason: 'restricted', ...EMPTY, url: target.url }
  const page = await runInTab(target.id, { action: 'snapshot', watch: true })
  if (!page) return { ok: false, reason: 'no-access', ...EMPTY, url: target.url }
  const url = target.url
  const next = await updateFormMemory((current) =>
    applyCapture(current, { url, title: target.title, fields: page.fields ?? [] }, Date.now()),
  )
  const plan = planFill(next, url, false)
  return { ok: true, ...EMPTY, ...pick(page), saved: plan.page.length, learn: next.settings.learn, url }
}

function capturedFields(raw: unknown[]): CapturedField[] {
  return raw.filter((item): item is CapturedField => Boolean(item && typeof item === 'object')).slice(0, 200)
}

const pending = new Map<number, ReturnType<typeof setTimeout>>()

/** With site access, remembered pages fill as they open and new entries are recorded as typed. */
async function onPageReady(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  if (!tab?.url || !scriptable(tab.url) || tab.discarded) return
  const state = await loadFormMemory()
  const ref = pageRefFor(tab.url)
  if (!ref || isHostBlocked(state.settings, ref.host)) return
  const remembered = state.pages[ref.id]
  const autoFill = state.settings.autoFill && Boolean(remembered?.autoFill)
  if (!autoFill && !state.settings.learn) return
  if (!/^file:/i.test(tab.url)) {
    const allowed = await chrome.permissions
      .contains({ origins: [`${new URL(tab.url).origin}/*`] })
      .catch(() => false)
    if (!allowed) return
  }
  if (autoFill) {
    await fillFormInTab('auto', tab)
    return
  }
  await runInTab(tabId, { action: 'inspect', watch: true })
}

function schedulePageReady(tabId: number): void {
  const timer = pending.get(tabId)
  if (timer) clearTimeout(timer)
  pending.set(
    tabId,
    setTimeout(() => {
      pending.delete(tabId)
      void onPageReady(tabId).catch((error) => logger.debug('page ready failed', error))
    }, 350),
  )
}

const recent = new Map<string, number>()

/** Chrome's command and the in-page shortcut listener can both report one key press. */
export async function runFormCommand(command: 'form-fill' | 'form-clear', tab?: chrome.tabs.Tab): Promise<void> {
  const now = Date.now()
  if (now - (recent.get(command) ?? 0) < 500) return
  recent.set(command, now)
  if (command === 'form-fill') await fillFormInTab('shortcut', tab)
  else await clearFormInTab('shortcut', tab)
}

export function registerFormMemory(): void {
  registerMessageHandler('FORM_MEMORY_CAPTURE', async (message, sender) => {
    if (message.type !== 'FORM_MEMORY_CAPTURE') return
    const url = sender.tab?.url ?? message.url
    if (!scriptable(url) || !Array.isArray(message.fields)) return
    const fields = capturedFields(message.fields)
    if (fields.length === 0) return
    await updateFormMemory((current) =>
      current.settings.learn
        ? applyCapture(current, { url, title: sender.tab?.title ?? message.title, fields }, Date.now())
        : current,
    )
  })

  registerMessageHandler('FORM_MEMORY_RUN', async (message) => {
    if (message.type !== 'FORM_MEMORY_RUN') return
    switch (message.action) {
      case 'fill':
        return fillFormInTab('panel', undefined, message.tabId)
      case 'clear':
        return clearFormInTab('panel', undefined, message.tabId)
      case 'save':
        return saveTab(message.tabId)
      default:
        return inspectTab(message.tabId)
    }
  })

  chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status === 'complete' || (info.url && tab.status === 'complete')) schedulePageReady(tabId)
  })
  chrome.tabs.onRemoved.addListener((tabId) => {
    const timer = pending.get(tabId)
    if (timer) clearTimeout(timer)
    pending.delete(tabId)
  })
}
