;(function () {
  if (window.__tbxClipboardMain) return
  window.__tbxClipboardMain = true

  var EVENT = '__tbx_clipboard_write'

  function emit(text) {
    try {
      if (typeof text !== 'string' || !text.trim()) return
      document.dispatchEvent(new CustomEvent(EVENT, { detail: text }))
    } catch (error) {
      /* ignore */
    }
  }

  function selectionText() {
    var active = document.activeElement
    if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') && active.type !== 'password') {
      var s = active.selectionStart
      var e = active.selectionEnd
      if (s != null && e != null && e > s) return active.value.slice(s, e)
    }
    var sel = window.getSelection()
    return sel ? sel.toString() : ''
  }

  // Copy buttons ("Copy code", "Copy link") use the async Clipboard API, which fires no copy event.
  try {
    var clip = navigator.clipboard
    if (clip && typeof clip.writeText === 'function') {
      var writeText = clip.writeText.bind(clip)
      clip.writeText = function (text) {
        var result = writeText(text)
        Promise.resolve(result).then(function () { emit(String(text)) }, function () {})
        return result
      }
    }
    if (clip && typeof clip.write === 'function') {
      var write = clip.write.bind(clip)
      clip.write = function (items) {
        var result = write(items)
        Promise.resolve(result).then(function () {
          try {
            Array.prototype.forEach.call(items || [], function (item) {
              if (item && item.types && item.types.indexOf('text/plain') !== -1) {
                item.getType('text/plain').then(function (blob) { return blob.text() }).then(emit)
              }
            })
          } catch (error) {
            /* ignore */
          }
        }, function () {})
        return result
      }
    }
  } catch (error) {
    /* clipboard not patchable */
  }

  // Legacy copy buttons: a hidden textarea + document.execCommand('copy').
  try {
    var exec = document.execCommand
    document.execCommand = function (command) {
      var text = ''
      if (typeof command === 'string' && (command.toLowerCase() === 'copy' || command.toLowerCase() === 'cut')) {
        text = selectionText()
      }
      var ok = exec.apply(document, arguments)
      if (ok && text) emit(text)
      return ok
    }
  } catch (error) {
    /* ignore */
  }
})()
