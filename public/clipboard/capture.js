;(function () {
  if (window.__tbxClipboardCapture) return
  window.__tbxClipboardCapture = true

  var MAX = 200000

  function selectedText() {
    var active = document.activeElement
    var field = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')
    if (field && active.type !== 'password') {
      var start = active.selectionStart
      var end = active.selectionEnd
      if (start != null && end != null && end > start) return active.value.slice(start, end)
    }
    var selection = window.getSelection()
    return selection ? selection.toString() : ''
  }

  // Runs after the page's own copy handler, so a custom clipboard payload wins over the selection.
  function onEdit(event) {
    var custom = event.clipboardData && event.clipboardData.getData('text/plain')
    var text = custom || (event.defaultPrevented ? '' : selectedText())
    if (!text || !String(text).trim()) return
    if (text.length > MAX) text = text.slice(0, MAX)
    try {
      chrome.runtime.sendMessage({ type: 'CLIPBOARD_CAPTURED', text: text })
    } catch (error) {
      /* extension reloaded */
    }
  }

  document.addEventListener('copy', onEdit)
  document.addEventListener('cut', onEdit)
})()
