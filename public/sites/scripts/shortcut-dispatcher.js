(function () {
  const alive = () => Boolean(globalThis.chrome && chrome.runtime && chrome.runtime.id)
  // Injected again into open tabs after an extension reload; the old copy is orphaned by then.
  if (typeof window.__tbxShortcutsAlive === 'function' && window.__tbxShortcutsAlive()) return
  window.__tbxShortcutsAlive = alive

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (target.isContentEditable) return true
    return Boolean(target.closest('[contenteditable=""], [contenteditable="true"]'))
  }

  function normalizeKey(key) {
    if (!key) return ''
    if (key === ' ') return 'Space'
    if (key.length === 1) return key.toUpperCase()
    if (/^f\d+$/i.test(key)) return key.toUpperCase()
    const lower = key.toLowerCase()
    if (lower === 'escape') return 'Esc'
    return key[0].toUpperCase() + key.slice(1).toLowerCase()
  }

  // Shift/Alt change event.key ("!" for Shift+1, "¡" for Alt+1 on macOS), so letters and digits
  // are read from the physical key instead.
  function keyFromEvent(event) {
    const code = event.code || ''
    if (/^Key[A-Z]$/.test(code)) return code.slice(3)
    if (/^Digit\d$/.test(code)) return code.slice(5)
    if (/^Numpad\d$/.test(code)) return code.slice(6)
    return event.key
  }

  function modifiersFromEvent(event) {
    return {
      key: normalizeKey(keyFromEvent(event)),
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    }
  }

  // Chrome binds Ctrl+Shift+C to “Inspect element”. Block it on the page immediately (capture phase)
  // so form fill can run, including while focus is inside an input.
  function isFormShortcutChord(event) {
    if (!event.shiftKey || event.altKey) return false
    if (!event.ctrlKey && !event.metaKey) return false
    const key = normalizeKey(keyFromEvent(event))
    return key === 'C' || key === 'F'
  }

  function dispatchShortcut(event, modifiers) {
    chrome.runtime
      .sendMessage({ type: 'SHORTCUT_KEY_EVENT', modifiers })
      .then((response) => {
        if (response && response.ok && response.data && response.data.handled) {
          event.preventDefault()
          event.stopPropagation()
        }
      })
      .catch(() => {})
  }

  function onKeyDown(event) {
    if (!alive()) {
      document.removeEventListener('keydown', onKeyDown, true)
      return
    }
    if (event.repeat) return
    if (isFormShortcutChord(event)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      dispatchShortcut(event, modifiersFromEvent(event))
      return
    }
    if (isEditableTarget(event.target)) return
    if (!event.key || event.key === 'Control' || event.key === 'Shift' || event.key === 'Alt' || event.key === 'Meta') {
      return
    }
    // Plain keys are never toolbox shortcuts; skip the round trip to the background.
    if (!event.ctrlKey && !event.altKey && !event.metaKey && !/^F\d+$/i.test(event.key)) return
    dispatchShortcut(event, modifiersFromEvent(event))
  }

  document.addEventListener('keydown', onKeyDown, true)
})()
