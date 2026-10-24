/** Long copies are capped so one paste cannot freeze the history list. */
export const MAX_CLIPBOARD_CAPTURE_CHARS = 200_000

/**
 * Text a copy or cut would place on the clipboard, read from the selection.
 * Password fields are skipped. This does not call the async Clipboard API, which
 * stalls for seconds in an unfocused side panel.
 */
export function readCopySelection(doc: Document): string {
  const active = doc.activeElement
  if (
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLInputElement && active.type !== 'password')
  ) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start != null && end != null && end > start) {
      return active.value.slice(start, end).slice(0, MAX_CLIPBOARD_CAPTURE_CHARS)
    }
  }
  return (doc.getSelection()?.toString() ?? '').slice(0, MAX_CLIPBOARD_CAPTURE_CHARS)
}
