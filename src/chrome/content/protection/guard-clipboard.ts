/**
 * Page world, document_start. Stops "ClickFix" / fake-CAPTCHA attacks: the page silently
 * copies a PowerShell or shell command and tells the user to press Win+R and paste it.
 *
 * A copy is only blocked when the text looks like a shell command AND it is not visibly shown
 * on the page, so "copy" buttons next to install instructions keep working.
 */
import { looksLikeShellCommand } from '@/core/protection/heuristics'

import { signalIsolated } from './pageBridge'

type GuardedWindow = Window & { __toolboxClipboardGuard?: boolean }

const MAX_SCAN_NODES = 5000

function isRendered(el: Element | null): boolean {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  if (rect.width < 4 || rect.height < 4) return false
  const style = getComputedStyle(el)
  return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.1
}

/** True when the command is printed somewhere the user can actually read it. */
function isVisibleOnPage(text: string): boolean {
  const needle = text.trim().slice(0, 48)
  if (!needle || !document.body) return false
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let scanned = 0
  for (let node = walker.nextNode(); node && scanned < MAX_SCAN_NODES; node = walker.nextNode()) {
    scanned++
    if (node.textContent?.includes(needle) && isRendered(node.parentElement)) return true
  }
  return false
}

function shouldBlock(text: string): boolean {
  if (!looksLikeShellCommand(text)) return false
  if (isVisibleOnPage(text)) return false
  signalIsolated('clipboard')
  return true
}

function patchClipboardApi(): void {
  const proto = (window as Window & { Clipboard?: { prototype: Clipboard } }).Clipboard?.prototype
  if (!proto) return
  const nativeWriteText = proto.writeText
  proto.writeText = function (this: Clipboard, text: string) {
    if (shouldBlock(String(text))) return Promise.resolve()
    return nativeWriteText.call(this, text)
  }
  const nativeWrite = proto.write
  if (nativeWrite) {
    proto.write = async function (this: Clipboard, items: ClipboardItems) {
      for (const item of items) {
        if (!item.types.includes('text/plain')) continue
        const text = await (await item.getType('text/plain')).text()
        if (shouldBlock(text)) return
      }
      return nativeWrite.call(this, items)
    }
  }
}

function selectedText(): string {
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    const { selectionStart, selectionEnd, value } = active
    if (selectionStart != null && selectionEnd != null && selectionEnd > selectionStart) {
      return value.slice(selectionStart, selectionEnd)
    }
  }
  return window.getSelection()?.toString() ?? ''
}

function patchExecCommand(): void {
  const native = Document.prototype.execCommand
  Document.prototype.execCommand = function (
    this: Document,
    command: string,
    showUI?: boolean,
    value?: string,
  ) {
    if (command.toLowerCase() === 'copy' && shouldBlock(selectedText())) return false
    return native.call(this, command, showUI, value)
  }
}

function patchSetData(): void {
  const native = DataTransfer.prototype.setData
  DataTransfer.prototype.setData = function (this: DataTransfer, format: string, data: string) {
    if (/^text(\/plain)?$/i.test(format) && shouldBlock(String(data))) return
    native.call(this, format, data)
  }
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxClipboardGuard) {
  guarded.__toolboxClipboardGuard = true
  patchClipboardApi()
  patchExecCommand()
  patchSetData()
}
