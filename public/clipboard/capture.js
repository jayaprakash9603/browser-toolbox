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
  var lastText = ''
  var lastAt = 0

  function report(text) {
    if (!text || !String(text).trim()) return
    if (text.length > MAX) text = text.slice(0, MAX)
    // A copy can arrive twice (copy event + execCommand/writeText hook).
    var now = Date.now()
    if (text === lastText && now - lastAt < 800) return
    lastText = text
    lastAt = now
    try {
      chrome.runtime.sendMessage({ type: 'CLIPBOARD_CAPTURED', text: text }).catch(function () {})
    } catch (error) {
      /* extension reloaded */
    }
  }

  function onEdit(event) {
    var custom = event.clipboardData && event.clipboardData.getData('text/plain')
    var text = custom || (event.defaultPrevented ? '' : selectedText())
    report(text)
  }

  // Programmatic copies (copy buttons) reported by the main-world hook.
  document.addEventListener('__tbx_clipboard_write', function (event) {
    report(typeof event.detail === 'string' ? event.detail : '')
  })

  document.addEventListener('copy', onEdit)
  document.addEventListener('cut', onEdit)
})()
