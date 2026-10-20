import { isFeatureOn, type WhatsappPlusState } from '@/core/sites/whatsapp'

import { postToMain } from '../bridge'

let observer: MutationObserver | null = null

function injectHeaderButtons(state: WhatsappPlusState): void {
  const header = document.querySelector('[data-testid="conversation-header"]')
  if (!header || header.querySelector('.tbx-wa-header-actions')) return
  const wrap = document.createElement('div')
  wrap.className = 'tbx-wa-header-actions'
  wrap.style.display = 'flex'
  wrap.style.alignItems = 'center'

  const add = (label: string, title: string, onClick: () => void) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tbx-wa-extra-btn'
    b.title = title
    b.textContent = label
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
    })
    wrap.appendChild(b)
  }

  const v = state.values
  if (isFeatureOn(v, 'btnMarkRead')) {
    add('✓', 'Mark read/unread', () => postToMain('toggleRead', {}))
  }
  if (isFeatureOn(v, 'btnPinChat')) {
    add('📌', 'Pin chat', () => postToMain('pinChat', {}))
  }
  if (isFeatureOn(v, 'btnChatInfo')) {
    add('ℹ', 'Chat info', () => postToMain('chatInfo', {}))
  }
  if (isFeatureOn(v, 'btnStartChat')) {
    add('💬', 'Start chat', () => {
      const num = prompt('Phone number (with country code):')
      if (num) postToMain('startChat', { number: num })
    })
  }
  if (isFeatureOn(v, 'btnQuickReply')) {
    add('⚡', 'Quick reply', () => postToMain('openQuickReply', {}))
  }
  if (isFeatureOn(v, 'btnAddTask')) {
    add('✓+', 'Add task', () => postToMain('addTask', {}))
  }

  header.appendChild(wrap)
}

function injectMessageButtons(state: WhatsappPlusState): void {
  const v = state.values
  if (!isFeatureOn(v, 'btnLike') && !isFeatureOn(v, 'btnTranslate') && !isFeatureOn(v, 'btnTranscribe')) return

  document.querySelectorAll<HTMLElement>('[data-testid="msg-container"]:not([data-tbx-wa-btn])').forEach((row) => {
    row.setAttribute('data-tbx-wa-btn', '1')
    if (row.querySelector(':scope > .tbx-wa-msg-actions')) return
    const msgId = row.closest('[data-id]')?.getAttribute('data-id') ?? ''
    const bar = document.createElement('span')
    bar.className = 'tbx-wa-msg-actions'
    if (isFeatureOn(v, 'btnLike') && msgId) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'tbx-wa-extra-btn'
      b.textContent = '👍'
      b.title = 'React 👍'
      b.addEventListener('click', (e) => {
        e.stopPropagation()
        postToMain('likeMessage', { msgId })
      })
      bar.appendChild(b)
    }
    if (isFeatureOn(v, 'btnTranslate')) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'tbx-wa-extra-btn'
      b.textContent = '🌐'
      b.title = 'Translate'
      const text = row.querySelector('.selectable-text')?.textContent ?? ''
      b.addEventListener('click', (e) => {
        e.stopPropagation()
        postToMain('translateMessage', { text })
      })
      bar.appendChild(b)
    }
    if (bar.childElementCount) row.appendChild(bar)
  })
}

export function startButtons(state: WhatsappPlusState): void {
  stopButtons()
  const scan = () => {
    injectHeaderButtons(state)
    injectMessageButtons(state)
  }
  scan()
  const root = document.querySelector('#app') ?? document.body
  observer = new MutationObserver(() => scan())
  observer.observe(root, { childList: true, subtree: true })
}

export function stopButtons(): void {
  observer?.disconnect()
  observer = null
  document.querySelectorAll('.tbx-wa-header-actions, .tbx-wa-msg-actions').forEach((el) => el.remove())
  document.querySelectorAll('[data-tbx-wa-btn]').forEach((el) => el.removeAttribute('data-tbx-wa-btn'))
}
