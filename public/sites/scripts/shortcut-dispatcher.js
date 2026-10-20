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

  function modifiersFromEvent(event) {
    return {
      key: normalizeKey(event.code && /^Key[A-Z]$/.test(event.code) ? event.code.slice(3) : event.key),
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    }
  }

  function onKeyDown(event) {
    if (!alive()) {
      document.removeEventListener('keydown', onKeyDown, true)
      return
    }
    if (event.repeat) return
    if (isEditableTarget(event.target)) return
    if (!event.key || event.key === 'Control' || event.key === 'Shift' || event.key === 'Alt' || event.key === 'Meta') {
      return
    }
    // Plain keys are never toolbox shortcuts; skip the round trip to the background.
    if (!event.ctrlKey && !event.altKey && !event.metaKey && !/^F\d+$/i.test(event.key)) return
    const modifiers = modifiersFromEvent(event)
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

  document.addEventListener('keydown', onKeyDown, true)
})()
