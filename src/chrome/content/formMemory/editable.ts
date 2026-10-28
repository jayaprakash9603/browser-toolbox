import { CLEAR_COLOR, FILL_COLOR } from './constants'
import { flash } from './events'
import { same } from './text'
import { editableText } from './values'

/** Replaces the text of a contenteditable region; an empty `text` clears it. */
export function writeEditable(host: HTMLElement, text: string): boolean {
  host.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(host)
  selection?.removeAllRanges()
  selection?.addRange(range)
  let typed: boolean
  try {
    // Rich editors keep their own model in sync only with edits they see as typing.
    typed = document.execCommand(text ? 'insertText' : 'delete', false, text)
  } catch {
    typed = false
  }
  if (!typed || !same(editableText(host), text)) {
    host.textContent = text
    host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }))
  }
  flash(host, text ? FILL_COLOR : CLEAR_COLOR)
  return true
}
