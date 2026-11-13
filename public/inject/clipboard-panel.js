;(function () {
  var opts = window.__TBX_CLIPBOARD_PANEL__
  delete window.__TBX_CLIPBOARD_PANEL__
  if (!opts || !opts.text) return

  var HOST_ID = 'tbx-clipboard-panel-host'
  var text = opts.text
  var storageKey = opts.storageKey || 'clipboardHistory'
  var query = ''
  var filter = 'all'
  var entries = Array.isArray(opts.entries) ? opts.entries.slice() : []
  var host
  var cardEl
  var listEl
  var toastEl
  var searchEl
  var kbdEl
  var filtersEl
  var countEl
  var toastTimer
  var toastLeaveTimer
  var resizeObs
  var railEl
  var thumbEl
  var drag = null
  var reduceMotion = false
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (e) {}

  function copyTextSync(value) {
    try {
      var area = document.createElement('textarea')
      area.value = value
      area.setAttribute('readonly', '')
      area.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0'
      document.documentElement.appendChild(area)
      area.focus()
      area.select()
      area.setSelectionRange(0, value.length)
      var ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch (err) {
      return false
    }
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(function () {
        return true
      }).catch(function () {
        return copyTextSync(value)
      })
    }
    return Promise.resolve(copyTextSync(value))
  }

  function copiedFlashEl() {
    var el = document.createElement('div')
    el.className = 'copied-flash'
    el.setAttribute('aria-hidden', 'true')
    el.innerHTML =
      '<span class="copied-pill">' +
      '<svg class="copied-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>' +
      '<svg class="copied-x" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 7l10 10"/><path d="M17 7 7 17"/></svg>' +
      '<span class="copied-label"></span></span>'
    return el
  }

  function clearCopied(item) {
    if (!item) return
    item.classList.remove('just-copied', 'copied-fail', 'copied-leaving')
  }

  function showCopied(item, ok) {
    if (!item) return
    var prev = listEl ? listEl.querySelector('.item.just-copied') : null
    if (prev && prev !== item) clearCopied(prev)
    var label = item.querySelector('.copied-label')
    if (label) label.textContent = ok ? text.copied : text.copyFailed
    item.classList.toggle('copied-fail', !ok)
    item.classList.remove('just-copied', 'copied-leaving')
    void item.offsetWidth
    item.classList.add('just-copied')
    if (toastEl) toastEl.textContent = ok ? text.copied : text.copyFailed
    window.clearTimeout(toastTimer)
    window.clearTimeout(toastLeaveTimer)
    toastTimer = window.setTimeout(function () {
      item.classList.add('copied-leaving')
      toastLeaveTimer = window.setTimeout(function () {
        clearCopied(item)
        if (toastEl) toastEl.textContent = ''
      }, reduceMotion ? 0 : 160)
    }, 1400)
  }

  function classify(value) {
    var v = String(value || '').trim()
    if (!v) return 'text'
    if (/^(#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|hsl)a?\([^)]{3,40}\)|oklch\([^)]{3,40}\))$/i.test(v)) {
      return 'color'
    }
    if (/^(?:https?:\/\/|www\.)\S+$/i.test(v)) return 'link'
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return 'email'
    if (/^[\d\s.,:+\-()%/]+$/.test(v) && /\d/.test(v)) return 'number'
    if (v.charAt(0) === '{' || v.charAt(0) === '[') {
      try {
        JSON.parse(v)
        return 'code'
      } catch (err) {}
    }
    if (
      /[{};]\s*$|=>|^\s*(?:const|let|var|function|import|export|return|def|class|if|for|SELECT|<\/?[a-z][\w-]*[\s>])/im.test(v) &&
      (v.indexOf('\n') !== -1 || /[{}();=<>]/.test(v))
    ) {
      return 'code'
    }
    return 'text'
  }

  function matchesFilter(entry, kind, next) {
    if (next === 'all') return true
    if (next === 'pinned') return !!entry.pinned
    if (next === 'link') return kind === 'link' || kind === 'email'
    if (next === 'code') return kind === 'code' || kind === 'color'
    return kind === 'text' || kind === 'number'
  }

  function matchesQuery(entry) {
    if (!query.trim()) return true
    return String(entry.text || '').toLowerCase().indexOf(query.trim().toLowerCase()) !== -1
  }

  function relativeTime(ms) {
    var sec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
    if (sec < 45) return text.justNow
    var min = Math.floor(sec / 60)
    if (min < 60) return min + ' ' + text.minAgo
    var hr = Math.floor(min / 60)
    if (hr < 24) return hr + (hr === 1 ? ' ' + text.hrAgo : ' ' + text.hrsAgo)
    var day = Math.floor(hr / 24)
    if (day === 1) return text.yesterday
    if (day < 7) return day + ' ' + text.daysAgo
    try {
      return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch (err) {
      return day + ' ' + text.daysAgo
    }
  }

  function startOfDay(now) {
    var d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  function dateGroup(ts) {
    var today = startOfDay(Date.now())
    if (ts >= today) return 'today'
    if (ts >= today - 86400000) return 'yesterday'
    return 'earlier'
  }

  function sectionLabel(key) {
    if (key === 'pinned') return text.pinned
    if (key === 'today') return text.today
    if (key === 'yesterday') return text.yesterday
    return text.earlier
  }

  function wordCount(entry) {
    if (typeof entry.wordCount === 'number') return entry.wordCount
    var trimmed = String(entry.text || '').trim()
    return trimmed ? trimmed.split(/\s+/).length : 0
  }

  function charCount(entry) {
    if (typeof entry.charCount === 'number') return entry.charCount
    return String(entry.text || '').length
  }

  function filterCounts() {
    var counts = { all: 0, pinned: 0, link: 0, code: 0, text: 0 }
    entries.forEach(function (entry) {
      var kind = classify(entry.text)
      counts.all += 1
      if (matchesFilter(entry, kind, 'pinned')) counts.pinned += 1
      if (matchesFilter(entry, kind, 'link')) counts.link += 1
      if (matchesFilter(entry, kind, 'code')) counts.code += 1
      if (matchesFilter(entry, kind, 'text')) counts.text += 1
    })
    return counts
  }

  function visibleEntries() {
    return entries
      .filter(function (entry) {
        return matchesFilter(entry, classify(entry.text), filter) && matchesQuery(entry)
      })
      .sort(function (a, b) {
        if (a.pinned !== b.pinned && filter !== 'pinned') return a.pinned ? -1 : 1
        return b.createdAt - a.createdAt
      })
  }

  function renderFilters() {
    if (!filtersEl) return
    var counts = filterCounts()
    var tabs = [
      { id: 'all', label: text.filterAll, count: counts.all },
      { id: 'pinned', label: text.filterPinned, count: counts.pinned },
      { id: 'link', label: text.filterLinks, count: counts.link },
      { id: 'code', label: text.filterCode, count: counts.code },
      { id: 'text', label: text.filterText, count: counts.text },
    ]
    filtersEl.textContent = ''
    tabs.forEach(function (tab) {
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'chip'
      btn.setAttribute('aria-pressed', tab.id === filter ? 'true' : 'false')
      var label = document.createElement('span')
      label.textContent = tab.label
      var badge = document.createElement('span')
      badge.className = 'chip-count'
      badge.textContent = String(tab.count)
      btn.appendChild(label)
      btn.appendChild(badge)
      btn.addEventListener('click', function () {
        filter = tab.id
        render()
      })
      filtersEl.appendChild(btn)
    })
  }

  function render() {
    renderFilters()
    if (!listEl) return
    listEl.textContent = ''
    var visible = visibleEntries()
    if (countEl) countEl.textContent = String(visible.length)
    if (!visible.length) {
      var empty = document.createElement('p')
      empty.className = 'empty'
      empty.textContent = query || filter !== 'all' ? text.noMatches : text.empty
      listEl.appendChild(empty)
      syncOverflow()
      return
    }

    var sections = []
    visible.forEach(function (entry) {
      var key = entry.pinned && filter !== 'pinned' ? 'pinned' : dateGroup(entry.createdAt)
      var last = sections[sections.length - 1]
      if (!last || last.key !== key) {
        last = { key: key, items: [] }
        sections.push(last)
      }
      last.items.push(entry)
    })

    sections.forEach(function (section) {
      listEl.appendChild(sectionRow(sectionLabel(section.key), section.items.length))
      section.items.forEach(function (entry) {
        listEl.appendChild(row(entry))
      })
    })
    syncOverflow()
  }

  function viewportCap() {
    var height = window.visualViewport ? window.visualViewport.height : window.innerHeight
    return Math.max(200, height - 24)
  }

  function railMetrics() {
    if (!listEl || !railEl || !thumbEl) return null
    var overflow = Math.max(0, listEl.scrollHeight - listEl.clientHeight)
    var track = railEl.clientHeight
    var thumbH = Math.max(24, Math.round(track * (listEl.clientHeight / Math.max(1, listEl.scrollHeight))))
    var maxThumb = Math.max(0, track - thumbH)
    var top = overflow <= 0 || maxThumb <= 0 ? 0 : Math.round(maxThumb * (listEl.scrollTop / overflow))
    return { overflow: overflow, track: track, thumbH: thumbH, maxThumb: maxThumb, top: top }
  }

  function applyThumb() {
    var metrics = railMetrics()
    if (!metrics || !thumbEl) return
    thumbEl.style.height = metrics.thumbH + 'px'
    thumbEl.style.transform = 'translateY(' + metrics.top + 'px)'
    if (!railEl) return
    var pct = metrics.overflow <= 0 ? 0 : Math.round((listEl.scrollTop / metrics.overflow) * 100)
    railEl.setAttribute('aria-valuenow', String(pct))
  }

  function syncOverflow() {
    if (!listEl || !cardEl) return
    var chrome = cardEl.querySelector('.chrome')
    var chromeH = chrome ? chrome.offsetHeight : 96
    listEl.style.maxHeight = Math.max(120, viewportCap() - chromeH) + 'px'
    var overflow = listEl.scrollHeight > listEl.clientHeight + 2
    listEl.classList.toggle('can-scroll', overflow)
    var atEnd = !overflow || listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 2
    listEl.classList.toggle('at-end', atEnd)
    if (railEl) railEl.hidden = !overflow
    applyThumb()
    if (overflow && railEl && railEl.clientHeight === 0) window.requestAnimationFrame(applyThumb)
  }

  function sectionRow(label, count) {
    var wrap = document.createElement('div')
    wrap.className = 'section'
    var name = document.createElement('span')
    name.textContent = label
    var num = document.createElement('span')
    num.className = 'section-count'
    num.textContent = String(count)
    var line = document.createElement('span')
    line.className = 'section-line'
    wrap.appendChild(name)
    wrap.appendChild(num)
    wrap.appendChild(line)
    return wrap
  }

  function kindMark(kind, value) {
    var el = document.createElement('span')
    el.className = 'kind ' + kind
    el.setAttribute('aria-hidden', 'true')
    if (kind === 'color') {
      el.style.background = value.trim()
      el.classList.add('swatch')
    } else {
      el.innerHTML = kindSvg(kind)
    }
    return el
  }

  function kindSvg(kind) {
    if (kind === 'link' || kind === 'email') {
      return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93"/><path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.41a5 5 0 0 0 7.07 7.07L14 18.07"/></svg>'
    }
    if (kind === 'code') {
      return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>'
    }
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h16"/></svg>'
  }

  function row(entry) {
    var kind = classify(entry.text)
    var wrap = document.createElement('article')
    wrap.className = 'item' + (entry.pinned ? ' pinned' : '')
    var body = document.createElement('button')
    body.type = 'button'
    body.className = 'body'
    body.setAttribute('data-clip-copy', '')
    body.setAttribute('aria-label', text.copy)
    body.appendChild(kindMark(kind, entry.text))
    var preview = document.createElement('span')
    preview.className = 'preview' + (kind === 'link' || kind === 'email' || kind === 'code' ? ' mono' : '')
    preview.textContent = entry.text
    body.appendChild(preview)
    body.addEventListener('click', function () {
      copyText(entry.text).then(function (ok) {
        showCopied(wrap, ok)
      })
    })

    var foot = document.createElement('div')
    foot.className = 'foot'
    var meta = document.createElement('p')
    meta.className = 'meta'
    var chars = charCount(entry)
    var words = wordCount(entry)
    var bits = [relativeTime(entry.createdAt), chars + ' ' + (chars === 1 ? text.character : text.characters)]
    if (words > 1) bits.push(words + ' ' + text.words)
    meta.textContent = bits.join(' · ')
    var actions = document.createElement('div')
    actions.className = 'actions'
    actions.appendChild(iconBtn(text.copy, 'copy', function () {
      copyText(entry.text).then(function (ok) {
        showCopied(wrap, ok)
      })
    }))
    actions.appendChild(iconBtn(entry.pinned ? text.unpin : text.pin, entry.pinned ? 'pin on' : 'pin', function () {
      chrome.runtime.sendMessage({
        type: 'CLIPBOARD_PANEL_MUTATE',
        op: 'pin',
        id: entry.id,
        pinned: !entry.pinned,
      }).catch(function () {})
    }))
    actions.appendChild(iconBtn(text.delete, 'delete', function () {
      chrome.runtime.sendMessage({
        type: 'CLIPBOARD_PANEL_MUTATE',
        op: 'delete',
        id: entry.id,
      }).catch(function () {})
    }))
    foot.appendChild(meta)
    var long = chars > 180 || String(entry.text || '').split(/\r?\n/).length > 3
    if (long) {
      var more = document.createElement('button')
      more.type = 'button'
      more.className = 'more'
      more.textContent = text.showAll
      more.setAttribute('aria-expanded', 'false')
      more.addEventListener('click', function (event) {
        event.stopPropagation()
        var open = preview.classList.toggle('open')
        more.textContent = open ? text.showLess : text.showAll
        more.setAttribute('aria-expanded', open ? 'true' : 'false')
        wrap.scrollIntoView({ block: 'nearest' })
        syncOverflow()
      })
      foot.appendChild(more)
    }
    foot.appendChild(actions)
    wrap.appendChild(body)
    wrap.appendChild(foot)
    wrap.appendChild(copiedFlashEl())
    return wrap
  }

  function iconSvg(kind) {
    if (kind.indexOf('copy') === 0) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
    }
    if (kind.indexOf('pin') === 0) {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M9 3h6l1 7h4l-5 6H8L3 10h4z"/></svg>'
    }
    return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
  }

  function iconBtn(label, kind, fn) {
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'icon ' + kind
    btn.setAttribute('aria-label', label)
    btn.title = label
    btn.innerHTML = iconSvg(kind)
    btn.addEventListener('click', function (event) {
      event.stopPropagation()
      fn()
    })
    return btn
  }

  function close() {
    if (host) host.remove()
    host = null
    window.clearTimeout(toastTimer)
    window.clearTimeout(toastLeaveTimer)
    if (resizeObs) {
      resizeObs.disconnect()
      resizeObs = null
    }
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.removeListener(onStorage)
    }
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('resize', syncOverflow)
  }

  function copyCards() {
    return listEl ? Array.prototype.slice.call(listEl.querySelectorAll('[data-clip-copy]')) : []
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (query && document.activeElement === searchEl) {
        query = ''
        searchEl.value = ''
        if (kbdEl) kbdEl.hidden = false
        render()
        return
      }
      close()
      return
    }
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      var target = event.target
      if (target && target.closest && target.closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      searchEl.focus()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      var cards = copyCards()
      if (!cards.length) return
      if (document.activeElement === searchEl && event.key === 'ArrowDown') {
        event.preventDefault()
        cards[0].focus()
        return
      }
      var index = cards.indexOf(document.activeElement)
      if (index === -1) return
      event.preventDefault()
      var next = index + (event.key === 'ArrowDown' ? 1 : -1)
      if (next < 0) {
        searchEl.focus()
        return
      }
      var card = cards[Math.min(cards.length - 1, next)]
      card.focus()
      var item = card.closest('.item')
      if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' })
    }
  }

  function onStorage(changes, area) {
    if (area !== 'local' || !changes[storageKey]) return
    var next = changes[storageKey].newValue
    if (!Array.isArray(next)) return
    entries = next.slice()
    render()
  }

  function trapWheel(event) {
    event.preventDefault()
    event.stopPropagation()
  }

  var prev = document.getElementById(HOST_ID)
  if (prev) prev.remove()

  host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;justify-content:flex-end;align-items:flex-start;padding:12px;pointer-events:none;'

  var sh = host.attachShadow({ mode: 'open' })
  sh.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.catcher{pointer-events:auto;position:absolute;inset:0;background:rgba(15,23,42,.16)}' +
    '.shell{pointer-events:auto;position:relative;width:min(360px,calc(100vw - 24px))}' +
    '.card{position:relative;display:flex;flex-direction:column;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);border-radius:12px;' +
    'border:1px solid rgba(24,24,27,.1);background:#fff;color:#18181b;' +
    'box-shadow:0 10px 32px rgba(15,23,42,.18);font:500 12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}' +
    '.chrome{flex:none;background:#fff}' +
    '.scroller{position:relative;min-height:0;flex:1 1 auto}' +
    '.head{display:flex;align-items:center;gap:8px;padding:8px 6px 0 12px}' +
    '.title-wrap{flex:1;min-width:0;display:flex;align-items:baseline;gap:6px}' +
    '.title{font-size:11px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:#3f3f46}' +
    '.count{font-size:11px;font-weight:600;color:#71717a;font-variant-numeric:tabular-nums}' +
    '.close,.icon,.chip{cursor:pointer}' +
    '.close{width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:#52525b;display:inline-flex;align-items:center;justify-content:center}' +
    '.close:hover{background:rgba(24,24,27,.06);color:#18181b}' +
    '.close:focus-visible,.search:focus-visible,.chip:focus-visible,.icon:focus-visible,.body:focus-visible{outline:2px solid #6366f1;outline-offset:2px}' +
    '.toolbar{display:flex;flex-direction:column;gap:6px;padding:8px 10px 8px;border-bottom:1px solid rgba(24,24,27,.08)}' +
    '.search-wrap{position:relative}' +
    '.search-icon{position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#71717a;display:flex}' +
    '.search{width:100%;height:32px;padding:0 32px 0 28px;border-radius:8px;border:1px solid rgba(24,24,27,.12);' +
    'background:#f4f4f5;color:inherit;font:inherit;outline:none}' +
    '.search::placeholder{color:#71717a}' +
    '.kbd{position:absolute;right:7px;top:50%;transform:translateY(-50%);border:1px solid rgba(24,24,27,.12);background:#fff;' +
    'border-radius:5px;padding:0 6px;font:600 10px/18px system-ui,sans-serif;color:#71717a}' +
    '.filters{display:flex;gap:1px;overflow-x:auto;scrollbar-width:none;padding:2px;border-radius:8px;background:#f4f4f5}' +
    '.filters::-webkit-scrollbar{display:none}' +
    '.chip{display:inline-flex;align-items:center;gap:3px;height:24px;padding:0 6px;border:0;border-radius:6px;' +
    'background:transparent;color:#52525b;font:600 11px/1 system-ui,sans-serif;white-space:nowrap;flex-shrink:0}' +
    '.chip[aria-pressed="true"]{background:#fff;color:#18181b;box-shadow:0 0 0 1px rgba(24,24,27,.08)}' +
    '.chip:hover{color:#18181b}' +
    '.chip-count{min-width:14px;padding:0 4px;border-radius:999px;font-size:10px;line-height:16px;text-align:center;' +
    'background:rgba(24,24,27,.06);font-variant-numeric:tabular-nums}' +
    '.chip[aria-pressed="true"] .chip-count{background:rgba(99,102,241,.12);color:#4f46e5}' +
    '.list{padding:8px 10px 16px;display:flex;flex-direction:column;gap:6px;min-height:0;max-height:calc(100vh - 148px);max-height:calc(100dvh - 148px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}' +
    '.list::-webkit-scrollbar{width:0;height:0}' +
    '.list.can-scroll{padding-right:12px}' +
    '.scroll-rail{position:absolute;top:8px;right:4px;bottom:8px;width:4px;border-radius:99px;background:#e4e4e7;z-index:3;pointer-events:auto;cursor:pointer;user-select:none;touch-action:none}' +
    '.scroll-rail[hidden]{display:none}' +
    '.scroll-thumb{position:absolute;left:0;right:0;top:0;width:4px;border-radius:99px;background:#71717a;min-height:24px;pointer-events:auto;cursor:grab}' +
    '.scroll-thumb:hover,.scroll-thumb.dragging{background:#52525b}' +
    '.scroll-thumb.dragging{cursor:grabbing}' +
    '.fade{position:absolute;left:1px;right:10px;bottom:0;height:28px;pointer-events:none;opacity:0;background:linear-gradient(transparent,#fff);transition:opacity .15s ease}' +
    '.list.can-scroll:not(.at-end)~.fade{opacity:1}' +
    '.section,.item,.empty{flex:none}' +
    '.section{display:flex;align-items:center;gap:6px;padding:2px 2px 0;font-size:10px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:#71717a}' +
    '.section-count{font-variant-numeric:tabular-nums;opacity:.75}' +
    '.section-line{height:1px;flex:1;background:rgba(24,24,27,.1)}' +
    '.item{position:relative;width:100%;min-width:0;border-radius:10px;border:1px solid rgba(24,24,27,.1);background:#fff;overflow:hidden}' +
    '.item:hover{border-color:rgba(99,102,241,.28)}' +
    '.item.pinned{border-color:rgba(217,119,6,.35);background:#fffbeb}' +
    '.item.just-copied{border-color:rgba(99,102,241,.45)}' +
    '.body{display:flex;align-items:flex-start;gap:8px;width:100%;min-width:0;margin:0;padding:8px 10px 2px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}' +
    '.kind{display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;flex-shrink:0;margin-top:1px;background:#eef2ff;color:#4f46e5}' +
    '.kind.link,.kind.email{background:#e0f2fe;color:#0284c7}' +
    '.kind.code{background:#fef3c7;color:#d97706}' +
    '.kind.swatch{border:1px solid rgba(24,24,27,.12)}' +
    '.preview{min-width:0;flex:1;font-size:12px;line-height:1.4;word-break:break-word;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
    '.preview.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}' +
    '.preview.open{display:block;-webkit-line-clamp:unset;max-height:12em;overflow-y:auto;overscroll-behavior:contain;padding-right:4px}' +
    '.more{border:0;background:transparent;color:#4f46e5;cursor:pointer;font:600 10px/1.2 system-ui,sans-serif;padding:0 4px;flex:none;white-space:nowrap}' +
    '.more:hover{text-decoration:underline}' +
    '.foot{display:flex;align-items:center;gap:2px;min-width:0;padding:0 6px 5px 38px}' +
    '.meta{flex:1;min-width:0;margin:0;font-size:10px;line-height:1.3;color:#71717a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}' +
    '.actions{display:flex;gap:1px;flex-shrink:0}' +
    '.icon{width:26px;height:26px;flex:none;border:0;border-radius:6px;background:transparent;color:#52525b;display:inline-flex;align-items:center;justify-content:center}' +
    '.icon:hover{background:rgba(24,24,27,.06);color:#18181b}' +
    '.icon.on{color:#d97706}' +
    '.icon.delete:hover{color:#dc2626;background:rgba(220,38,38,.08)}' +
    '.empty{margin:0;padding:18px 12px;text-align:center;font-size:12px;line-height:1.45;color:#71717a}' +
    '.copied-flash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.78);' +
    'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;pointer-events:none;z-index:2}' +
    '.item.just-copied .copied-flash{animation:copied-in .18s cubic-bezier(.2,.8,.2,1) forwards}' +
    '.item.just-copied.copied-leaving .copied-flash{animation:copied-out .16s ease-in forwards}' +
    '.copied-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 12px 7px 10px;border-radius:999px;background:#4f46e5;color:#fff;' +
    'font:650 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 20px rgba(79,70,229,.28);transform:translateY(6px) scale(.88);opacity:0}' +
    '.item.just-copied .copied-pill{animation:copied-pill .42s cubic-bezier(.22,1.15,.36,1) .04s forwards}' +
    '.copied-check,.copied-x{flex:none}' +
    '.copied-x,.item.copied-fail .copied-check{display:none}' +
    '.item.copied-fail .copied-x{display:block}' +
    '.item.copied-fail .copied-pill{background:#dc2626;box-shadow:0 8px 20px rgba(220,38,38,.28)}' +
    '.copied-check path{stroke-dasharray:22;stroke-dashoffset:22}' +
    '.item.just-copied:not(.copied-fail) .copied-check path{animation:copied-draw .32s ease-out .12s forwards}' +
    '.live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    '@keyframes copied-in{to{opacity:1}}' +
    '@keyframes copied-out{from{opacity:1}to{opacity:0}}' +
    '@keyframes copied-pill{0%{transform:translateY(6px) scale(.88);opacity:0}62%{transform:translateY(0) scale(1.04);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}' +
    '@keyframes copied-draw{to{stroke-dashoffset:0}}' +
    '@media (prefers-reduced-motion:reduce){' +
    '.item.just-copied .copied-flash,.item.just-copied.copied-leaving .copied-flash,.item.just-copied .copied-pill,.item.just-copied:not(.copied-fail) .copied-check path{animation:none}' +
    '.item.just-copied .copied-flash{opacity:1}.item.just-copied.copied-leaving .copied-flash{opacity:0}' +
    '.item.just-copied .copied-pill{transform:none;opacity:1}.copied-check path{stroke-dashoffset:0}' +
    '}' +
    '@media (prefers-color-scheme:dark){' +
    '.catcher{background:rgba(0,0,0,.32)}' +
    '.card{background:#18181b;color:#f4f4f5;border-color:rgba(255,255,255,.1);box-shadow:0 12px 36px rgba(0,0,0,.45)}' +
    '.title{color:#d4d4d8}.count,.meta,.empty,.kbd,.chip{color:#a1a1aa}' +
    '.close{color:#a1a1aa}.close:hover{background:rgba(255,255,255,.08);color:#fafafa}' +
    '.toolbar{border-bottom-color:rgba(255,255,255,.08)}' +
    '.search,.filters{background:#27272a;border-color:rgba(255,255,255,.1)}' +
    '.kbd{background:#18181b;border-color:rgba(255,255,255,.12)}' +
    '.chip[aria-pressed="true"]{background:#3f3f46;color:#fafafa;box-shadow:none}' +
    '.chip-count{background:rgba(255,255,255,.08)}' +
    '.chip[aria-pressed="true"] .chip-count{background:rgba(165,180,252,.18);color:#c7d2fe}' +
    '.scroll-rail{background:#3f3f46}' +
    '.scroll-thumb{background:#a1a1aa}' +
    '.scroll-thumb:hover,.scroll-thumb.dragging{background:#e4e4e7}' +
    '.chrome{background:#18181b}' +
    '.fade{background:linear-gradient(transparent,#18181b)}' +
    '.more{color:#c7d2fe}' +
    '.section-line{background:rgba(255,255,255,.1)}' +
    '.item{background:#27272a;border-color:rgba(255,255,255,.1)}' +
    '.item.pinned{background:#292524;border-color:rgba(251,191,36,.35)}' +
    '.item.just-copied{border-color:rgba(165,180,252,.55)}' +
    '.copied-flash{background:rgba(24,24,27,.72)}' +
    '.copied-pill{background:#6366f1;box-shadow:0 10px 24px rgba(0,0,0,.35)}' +
    '.item.copied-fail .copied-pill{background:#ef4444}' +
    '.kind{background:rgba(99,102,241,.18);color:#c7d2fe}' +
    '.kind.link,.kind.email{background:rgba(14,165,233,.18);color:#7dd3fc}' +
    '.kind.code{background:rgba(245,158,11,.18);color:#fcd34d}' +
    '.icon{color:#a1a1aa}.icon:hover{background:rgba(255,255,255,.08);color:#fafafa}' +
    '}' +
    '</style>' +
    '<div class="catcher" data-action="catcher"></div>' +
    '<div class="shell"><div class="card" role="dialog" aria-modal="true" aria-labelledby="tbx-clip-title">' +
    '<div class="chrome"><div class="head"><div class="title-wrap"><h1 class="title" id="tbx-clip-title"></h1><span class="count" aria-live="polite"></span></div>' +
    '<button type="button" class="close" data-action="close">' +
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
    '</button></div>' +
    '<div class="toolbar"><div class="search-wrap">' +
    '<span class="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg></span>' +
    '<input class="search" type="search" autocomplete="off" spellcheck="false" />' +
    '<kbd class="kbd" aria-hidden="true">/</kbd></div>' +
    '<div class="filters" role="group"></div></div></div>' +
    '<div class="scroller"><div class="list" id="tbx-clip-list"></div>' +
    '<div class="scroll-rail" hidden role="scrollbar" aria-controls="tbx-clip-list" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
    '<div class="scroll-thumb"></div></div>' +
    '<div class="fade" aria-hidden="true"></div></div>' +
    '<div class="live" role="status" aria-live="polite"></div></div></div>'

  sh.querySelector('.title').textContent = text.title
  countEl = sh.querySelector('.count')
  searchEl = sh.querySelector('.search')
  searchEl.setAttribute('aria-label', text.search)
  searchEl.setAttribute('placeholder', text.search)
  kbdEl = sh.querySelector('.kbd')
  filtersEl = sh.querySelector('.filters')
  filtersEl.setAttribute('aria-label', text.filterLabel)
  cardEl = sh.querySelector('.card')
  listEl = sh.querySelector('.list')
  toastEl = sh.querySelector('.live')
  railEl = sh.querySelector('.scroll-rail')
  thumbEl = sh.querySelector('.scroll-thumb')
  if (railEl) railEl.setAttribute('aria-label', text.title)
  sh.querySelector('[data-action="close"]').setAttribute('aria-label', text.close)
  sh.querySelector('[data-action="close"]').addEventListener('click', close)
  sh.querySelector('[data-action="catcher"]').addEventListener('click', close)
  sh.querySelector('[data-action="catcher"]').addEventListener('wheel', trapWheel, { passive: false })
  listEl.addEventListener(
    'wheel',
    function (event) {
      event.stopPropagation()
      var inner = event.target && event.target.closest && event.target.closest('.preview.open')
      if (inner && inner.scrollHeight > inner.clientHeight + 1) {
        var innerTop = inner.scrollTop <= 0
        var innerBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1
        if (!((event.deltaY < 0 && innerTop) || (event.deltaY > 0 && innerBottom))) return
      }
      var canScroll = listEl.scrollHeight > listEl.clientHeight + 1
      var atTop = listEl.scrollTop <= 0
      var atBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 1
      if (!canScroll || (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        event.preventDefault()
      }
    },
    { passive: false },
  )
  listEl.addEventListener('scroll', syncOverflow, { passive: true })
  listEl.addEventListener(
    'touchmove',
    function (event) {
      event.stopPropagation()
    },
    { passive: true },
  )
  if (railEl && thumbEl) {
    railEl.addEventListener('pointerdown', function (event) {
      if (event.target === thumbEl) return
      var metrics = railMetrics()
      if (!metrics || metrics.maxThumb <= 0) return
      var rect = railEl.getBoundingClientRect()
      var y = event.clientY - rect.top - metrics.thumbH / 2
      var top = Math.min(metrics.maxThumb, Math.max(0, y))
      listEl.scrollTop = (top / metrics.maxThumb) * metrics.overflow
    })
    thumbEl.addEventListener('pointerdown', function (event) {
      event.preventDefault()
      event.stopPropagation()
      var metrics = railMetrics()
      if (!metrics) return
      drag = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startTop: metrics.top,
        maxThumb: metrics.maxThumb,
        overflow: metrics.overflow,
      }
      thumbEl.classList.add('dragging')
      if (thumbEl.setPointerCapture) thumbEl.setPointerCapture(event.pointerId)
    })
    thumbEl.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return
      if (drag.maxThumb <= 0) return
      var top = Math.min(drag.maxThumb, Math.max(0, drag.startTop + (event.clientY - drag.startY)))
      listEl.scrollTop = (top / drag.maxThumb) * drag.overflow
    })
    function endDrag(event) {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return
      drag = null
      thumbEl.classList.remove('dragging')
    }
    thumbEl.addEventListener('pointerup', endDrag)
    thumbEl.addEventListener('pointercancel', endDrag)
  }

  searchEl.addEventListener('input', function () {
    query = searchEl.value
    if (kbdEl) kbdEl.hidden = Boolean(query)
    render()
  })

  document.documentElement.appendChild(host)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('resize', syncOverflow)
  if (typeof ResizeObserver === 'function') {
    resizeObs = new ResizeObserver(syncOverflow)
    resizeObs.observe(cardEl)
    resizeObs.observe(listEl)
  }
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(onStorage)
  }
  render()
  window.requestAnimationFrame(syncOverflow)
  if (!reduceMotion && host.animate) {
    host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' })
  }
  window.setTimeout(function () {
    searchEl.focus()
  }, 0)
})()
