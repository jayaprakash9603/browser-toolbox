import { applyTemplateVariables, isFeatureOn, type WhatsappPlusState } from '@/core/sites/whatsapp'

import { postToMain } from '../bridge'
import { activeChatTitle, insertIntoComposer, loadState, saveState, uid } from '../store'

let observer: MutationObserver | null = null
let currentState: WhatsappPlusState | null = null

const ICONS = {
  startChat: 'M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z',
  quickReply: 'M7 2v11h3v9l7-12h-4l4-8z',
  addTask: 'M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z',
  translate: 'm12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z',
} as const

function svgIcon(path: string, size = 22): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('aria-hidden', 'true')
  const p = document.createElementNS(ns, 'path')
  p.setAttribute('d', path)
  p.setAttribute('fill', 'currentColor')
  svg.appendChild(p)
  return svg
}

// ---------- page toast + popover ----------

let toastTimer: ReturnType<typeof setTimeout> | null = null

export function pageToast(message: string): void {
  document.querySelector('.tbx-wa-toast')?.remove()
  const t = document.createElement('div')
  t.className = 'tbx-wa-toast'
  t.textContent = message
  document.body.appendChild(t)
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.remove(), 2600)
}

function closePopover(): void {
  document.querySelector('.tbx-wa-popover')?.remove()
  document.removeEventListener('mousedown', onOutside, true)
}

function onOutside(e: MouseEvent): void {
  const pop = document.querySelector('.tbx-wa-popover')
  if (pop && !pop.contains(e.target as Node)) closePopover()
}

function openPopover(anchor: HTMLElement, title: string, content: HTMLElement): void {
  closePopover()
  const pop = document.createElement('div')
  pop.className = 'tbx-wa-popover'
  const h = document.createElement('div')
  h.className = 'tbx-wa-popover__title'
  h.textContent = title
  pop.append(h, content)
  document.body.appendChild(pop)
  const r = anchor.getBoundingClientRect()
  const w = pop.offsetWidth
  pop.style.top = `${Math.round(r.bottom + 8)}px`
  pop.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)))}px`
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closePopover()
    }
  })
  setTimeout(() => document.addEventListener('mousedown', onOutside, true), 0)
  pop.querySelector<HTMLElement>('input, button')?.focus()
}

function inputForm(placeholder: string, submitLabel: string, onSubmit: (value: string) => void, type = 'text'): HTMLElement {
  const form = document.createElement('form')
  form.className = 'tbx-wa-popover__form'
  const input = document.createElement('input')
  input.className = 'tbx-wa-popover__input'
  input.type = type
  input.placeholder = placeholder
  const btn = document.createElement('button')
  btn.type = 'submit'
  btn.className = 'tbx-wa-popover__btn'
  btn.textContent = submitLabel
  form.append(input, btn)
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const v = input.value.trim()
    if (!v) return input.focus()
    closePopover()
    onSubmit(v)
  })
  return form
}

// ---------- header actions ----------

function quickReplyList(): HTMLElement {
  const list = document.createElement('div')
  list.className = 'tbx-wa-popover__list'
  const templates = currentState?.data.templates ?? []
  if (!templates.length) {
    const empty = document.createElement('p')
    empty.className = 'tbx-wa-popover__empty'
    empty.textContent = 'No templates yet. Add them in ChatBoost → Business Tools → Message Templates.'
    list.appendChild(empty)
    return list
  }
  for (const t of templates) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'tbx-wa-popover__item'
    const name = document.createElement('strong')
    name.textContent = t.name
    const body = document.createElement('span')
    body.textContent = t.body
    item.append(name, body)
    item.addEventListener('click', () => {
      closePopover()
      if (!insertIntoComposer(applyTemplateVariables(t.body, { name: activeChatTitle() }))) pageToast('Open a chat first')
    })
    list.appendChild(item)
  }
  return list
}

async function addTask(title: string): Promise<void> {
  const s = await loadState()
  const chat = activeChatTitle()
  await saveState({ data: { tasks: [{ id: uid(), title, chatLabel: chat || undefined, done: false, createdAt: Date.now() }, ...s.data.tasks] } })
  pageToast('Task added')
}

function injectHeaderButtons(state: WhatsappPlusState): void {
  const header = document.querySelector('#main header') ?? document.querySelector('[data-testid="conversation-header"]')
  if (!header || header.querySelector('.tbx-wa-header-actions')) return
  const wrap = document.createElement('div')
  wrap.className = 'tbx-wa-header-actions'

  const add = (iconPath: string, title: string, onClick: (btn: HTMLButtonElement) => void) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tbx-wa-hdr-btn'
    b.title = title
    b.setAttribute('aria-label', title)
    b.appendChild(svgIcon(iconPath))
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick(b)
    })
    wrap.appendChild(b)
  }

  const v = state.values
  if (isFeatureOn(v, 'btnStartChat')) {
    add(ICONS.startChat, 'Start new chat', (btn) =>
      openPopover(btn, 'Start a chat with any number', inputForm('Phone number with country code', 'Chat', (num) => {
        const digits = num.replace(/\D/g, '')
        if (digits.length < 6) return pageToast('Enter a valid phone number')
        postToMain('startChat', { number: digits })
      }, 'tel')),
    )
  }
  if (isFeatureOn(v, 'btnQuickReply')) add(ICONS.quickReply, 'Quick replies', (btn) => openPopover(btn, 'Quick replies', quickReplyList()))
  if (isFeatureOn(v, 'btnAddTask')) {
    add(ICONS.addTask, 'Add task', (btn) =>
      openPopover(btn, 'Add a task for this chat', inputForm('Follow up about…', 'Add', (t) => void addTask(t))),
    )
  }
  if (!wrap.childElementCount) return

  const actions = header.lastElementChild
  if (actions && actions !== wrap) header.insertBefore(wrap, actions)
  else header.appendChild(wrap)
}

// ---------- message actions ----------

type TranslatorApi = {
  create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<{ translate: (t: string) => Promise<string> }>
}
type DetectorApi = { create: () => Promise<{ detect: (t: string) => Promise<{ detectedLanguage: string; confidence: number }[]> }> }

async function translateText(text: string, target: string): Promise<string> {
  const g = globalThis as typeof globalThis & { Translator?: TranslatorApi; LanguageDetector?: DetectorApi }
  if (g.Translator && g.LanguageDetector) {
    try {
      const detector = await g.LanguageDetector.create()
      const source = (await detector.detect(text))[0]?.detectedLanguage
      if (source && source !== 'und') {
        if (source === target) return text
        const tr = await g.Translator.create({ sourceLanguage: source, targetLanguage: target })
        return await tr.translate(text)
      }
    } catch {
      /* fall through to the network translator */
    }
  }
  const res = (await chrome.runtime.sendMessage({ type: 'WA_TRANSLATE', text, target })) as
    | { ok: boolean; data?: { text?: string } }
    | undefined
  if (!res?.ok || !res.data?.text) throw new Error('translate failed')
  return res.data.text
}

async function toggleTranslation(row: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  const existing = row.querySelector('.tbx-wa-translation')
  if (existing) {
    existing.remove()
    return
  }
  const text = row.querySelector('.selectable-text, [data-testid="selectable-text"]')?.textContent?.trim() ?? ''
  if (!text) return pageToast('Nothing to translate in this message')
  const target = (navigator.language || 'en').split('-')[0]
  btn.classList.add('is-busy')
  try {
    const translated = await translateText(text, target)
    const box = document.createElement('div')
    box.className = 'tbx-wa-translation'
    const label = document.createElement('span')
    label.className = 'tbx-wa-translation__label'
    label.textContent = `Translated · ${target.toUpperCase()}`
    const body = document.createElement('div')
    body.textContent = translated
    box.append(label, body)
    const host = row.querySelector('.copyable-text') ?? row
    host.appendChild(box)
  } catch {
    pageToast('Could not translate this message right now')
  } finally {
    btn.classList.remove('is-busy')
  }
}

function msgButton(content: Node | string, title: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'tbx-wa-extra-btn'
  b.title = title
  b.setAttribute('aria-label', title)
  b.append(content)
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick(b)
  })
  return b
}

function injectMessageButtons(state: WhatsappPlusState): void {
  const v = state.values
  if (!isFeatureOn(v, 'btnTranslate')) return

  document.querySelectorAll<HTMLElement>('[data-testid="msg-container"]:not([data-tbx-wa-btn])').forEach((row) => {
    row.setAttribute('data-tbx-wa-btn', '1')
    if (row.querySelector(':scope > .tbx-wa-msg-actions')) return
    const bar = document.createElement('span')
    bar.className = 'tbx-wa-msg-actions'
    if (row.querySelector('.selectable-text, [data-testid="selectable-text"]')) {
      bar.appendChild(msgButton(svgIcon(ICONS.translate, 18), 'Translate', (b) => void toggleTranslation(row, b)))
    }
    if (bar.childElementCount) row.appendChild(bar)
  })
}

export function startButtons(state: WhatsappPlusState): void {
  stopButtons()
  currentState = state
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
  closePopover()
  document.querySelectorAll('.tbx-wa-header-actions, .tbx-wa-msg-actions, .tbx-wa-translation').forEach((el) => el.remove())
  document.querySelectorAll('[data-tbx-wa-btn]').forEach((el) => el.removeAttribute('data-tbx-wa-btn'))
}
