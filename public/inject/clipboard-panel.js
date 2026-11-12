;(function () {
  var opts = window.__TBX_CLIPBOARD_PANEL__
  delete window.__TBX_CLIPBOARD_PANEL__
  if (!opts || !opts.text) return

  var HOST_ID = 'tbx-clipboard-panel-host'
  var text = opts.text
  var storageKey = opts.storageKey || 'clipboardHistory'
  var query = ''
  var entries = Array.isArray(opts.entries) ? opts.entries.slice() : []
  var host
  var listEl
  var statusEl
  var searchEl

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
    } catch (e) {
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

  function setStatus(ok) {
    if (!statusEl) return
    statusEl.textContent = ok ? text.copied : text.copyFailed
    statusEl.classList.toggle('fail', !ok)
    window.setTimeout(function () {
      if (statusEl) statusEl.textContent = ''
    }, 1400)
  }

  function matches(entry) {
    if (!query.trim()) return true
    return String(entry.text || '').toLowerCase().indexOf(query.trim().toLowerCase()) !== -1
  }

  function render() {
    if (!listEl) return
    listEl.textContent = ''
    var visible = entries.filter(matches)
    if (!visible.length) {
      var empty = document.createElement('p')
      empty.className = 'empty'
      empty.textContent = text.empty
      listEl.appendChild(empty)
      return
    }
    var pinned = visible.filter(function (e) { return e.pinned })
    var rest = visible.filter(function (e) { return !e.pinned })
    if (pinned.length) {
      listEl.appendChild(sectionLabel(text.pinned))
      pinned.forEach(function (entry) { listEl.appendChild(row(entry)) })
    }
    rest.forEach(function (entry) { listEl.appendChild(row(entry)) })
  }

  function sectionLabel(label) {
    var el = document.createElement('div')
    el.className = 'section'
    el.textContent = label
    return el
  }

  function row(entry) {
    var wrap = document.createElement('article')
    wrap.className = 'item' + (entry.pinned ? ' pinned' : '')
    var body = document.createElement('button')
    body.type = 'button'
    body.className = 'body'
    body.title = text.copy
    var preview = document.createElement('span')
    preview.className = 'preview'
    preview.textContent = entry.text
    body.appendChild(preview)
    body.addEventListener('click', function () {
      copyText(entry.text).then(setStatus)
    })
    var actions = document.createElement('div')
    actions.className = 'actions'
    actions.appendChild(actionBtn(text.copy, function () {
      copyText(entry.text).then(setStatus)
    }, 'copy'))
    actions.appendChild(actionBtn(entry.pinned ? text.unpin : text.pin, function () {
      chrome.runtime.sendMessage({
        type: 'CLIPBOARD_PANEL_MUTATE',
        op: 'pin',
        id: entry.id,
        pinned: !entry.pinned,
      }).catch(function () {})
    }, 'pin'))
    actions.appendChild(actionBtn(text.delete, function () {
      chrome.runtime.sendMessage({
        type: 'CLIPBOARD_PANEL_MUTATE',
        op: 'delete',
        id: entry.id,
      }).catch(function () {})
    }, 'delete'))
    wrap.appendChild(body)
    wrap.appendChild(actions)
    return wrap
  }

  function actionBtn(label, fn, kind) {
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'icon ' + kind
    btn.setAttribute('aria-label', label)
    btn.title = label
    btn.addEventListener('click', function (e) {
      e.stopPropagation()
      fn()
    })
    return btn
  }

  function close() {
    if (host) host.remove()
    host = null
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.removeListener(onStorage)
    }
    window.removeEventListener('keydown', onKey, true)
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  function onStorage(changes, area) {
    if (area !== 'local' || !changes[storageKey]) return
    var next = changes[storageKey].newValue
    if (!Array.isArray(next)) return
    entries = next.slice()
    entries.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.createdAt - a.createdAt
    })
    render()
  }

  var prev = document.getElementById(HOST_ID)
  if (prev) prev.remove()

  host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText =
    'position:fixed;right:16px;top:16px;bottom:16px;width:min(400px,calc(100vw - 32px));z-index:2147483646;pointer-events:none;'

  var sh = host.attachShadow({ mode: 'open' })
  sh.innerHTML =
    '<style>' +
    ':host{all:initial}*{box-sizing:border-box}' +
    '.card{pointer-events:auto;display:flex;flex-direction:column;height:100%;border-radius:16px;' +
    'border:1px solid rgba(255,255,255,.14);background:rgba(22,22,26,.97);color:#f4f4f5;' +
    'box-shadow:0 20px 60px rgba(0,0,0,.45);font:500 13px/1.35 system-ui,sans-serif;overflow:hidden}' +
    '.head{display:flex;align-items:center;gap:8px;padding:12px 12px 8px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.title{flex:1;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.85}' +
    '.close,.icon{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:8px}' +
    '.close{font-size:20px;line-height:1;padding:4px 8px;opacity:.75}' +
    '.close:hover{opacity:1;background:rgba(255,255,255,.08)}' +
    '.search-wrap{padding:8px 12px 6px}' +
    '.search{width:100%;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);' +
    'background:rgba(255,255,255,.06);color:inherit;font:inherit;outline:none}' +
    '.search:focus{border-color:rgba(99,102,241,.55)}' +
    '.status{min-height:16px;padding:0 12px;font-size:11px;font-weight:600;color:#86efac}' +
    '.status.fail{color:#fca5a5}' +
    '.list{flex:1;overflow:auto;padding:6px 8px 12px;scrollbar-width:thin;display:flex;flex-direction:column;gap:6px}' +
    '.section{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.65;padding:4px 6px}' +
    '.item{border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);overflow:hidden}' +
    '.item.pinned{border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.06)}' +
    '.body{display:block;width:100%;text-align:left;padding:10px 10px 6px;border:0;background:transparent;color:inherit;cursor:pointer}' +
    '.preview{display:block;font:500 12px/1.4 ui-monospace,monospace;word-break:break-word;white-space:pre-wrap;max-height:4.5em;overflow:hidden}' +
    '.actions{display:flex;gap:2px;padding:0 6px 6px}' +
    '.icon{padding:6px;font-size:11px;font-weight:600;opacity:.8}' +
    '.icon:hover{opacity:1;background:rgba(255,255,255,.08)}' +
    '.icon.delete:hover{color:#fca5a5}' +
    '.empty{padding:24px 12px;text-align:center;font-size:12px;color:rgba(255,255,255,.55)}' +
    '@media (prefers-color-scheme:light){.card{color:#18181b;background:rgba(255,255,255,.98);border-color:rgba(0,0,0,.1);' +
    'box-shadow:0 20px 60px rgba(0,0,0,.12)}.search{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1)}' +
    '.item{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.08)}.empty{color:rgba(0,0,0,.55)}}' +
    '</style>' +
    '<div class="card" role="dialog" aria-modal="true">' +
    '<div class="head"><span class="title"></span><button type="button" class="close" data-action="close">×</button></div>' +
    '<div class="search-wrap"><input class="search" type="search" autocomplete="off" /></div>' +
    '<div class="status" aria-live="polite"></div>' +
    '<div class="list"></div></div>'

  sh.querySelector('.title').textContent = text.title
  searchEl = sh.querySelector('.search')
  searchEl.setAttribute('aria-label', text.search)
  searchEl.setAttribute('placeholder', text.search)
  statusEl = sh.querySelector('.status')
  listEl = sh.querySelector('.list')
  sh.querySelector('[data-action="close"]').addEventListener('click', close)

  searchEl.addEventListener('input', function () {
    query = searchEl.value
    render()
  })

  document.documentElement.appendChild(host)
  window.addEventListener('keydown', onKey, true)
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(onStorage)
  }
  render()
})()
