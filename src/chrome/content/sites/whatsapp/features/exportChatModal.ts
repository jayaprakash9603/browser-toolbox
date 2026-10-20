import { DEFAULT_CHAT_EXPORT_OPTIONS, type ChatExportFormat, type ChatExportOptions } from '@/core/sites/whatsapp/chatExport'

import { exportChatMain } from '../bridge'
import { activeChatTitle } from '../store'

function downloadFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fieldCheckbox(
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): HTMLLabelElement {
  const row = document.createElement('label')
  row.className = 'tbx-d-export-chat__check'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  const span = document.createElement('span')
  span.textContent = label
  row.append(input, span)
  return row
}

function fieldRadio(
  name: string,
  value: ChatExportFormat,
  label: string,
  checked: boolean,
  onPick: () => void,
): HTMLLabelElement {
  const row = document.createElement('label')
  row.className = 'tbx-d-export-chat__radio'
  const input = document.createElement('input')
  input.type = 'radio'
  input.name = name
  input.className = 'tbx-d-radio'
  input.value = value
  input.checked = checked
  input.addEventListener('change', () => {
    if (input.checked) onPick()
  })
  const span = document.createElement('span')
  span.textContent = label
  row.append(input, span)
  return row
}

export function openExportChatModal(host: HTMLElement, notify: (msg: string) => void): void {
  host.querySelector('.tbx-d-export-chat-modal')?.remove()

  const opts: ChatExportOptions = { ...DEFAULT_CHAT_EXPORT_OPTIONS }
  let busy = false

  const close = () => overlay.remove()

  const overlay = document.createElement('div')
  overlay.className = 'tbx-d-modal tbx-d-export-chat-modal'
  const box = document.createElement('div')
  box.className = 'tbx-d-modal__box tbx-d-modal__box--export-chat'

  const title = document.createElement('h3')
  title.className = 'tbx-d-modal__title'
  title.textContent = 'Export chat'

  const chatHint = document.createElement('p')
  chatHint.className = 'tbx-d-export-chat__hint'
  chatHint.textContent = activeChatTitle() ? `Chat: ${activeChatTitle()}` : 'Open a chat in WhatsApp first.'

  const formats = document.createElement('div')
  formats.className = 'tbx-d-export-chat__formats'
  const formatLabels: [ChatExportFormat, string][] = [
    ['html', 'HTML'],
    ['json', 'JSON'],
    ['excel', 'Excel'],
    ['csv', 'CSV'],
  ]
  for (const [value, label] of formatLabels) {
    formats.appendChild(
      fieldRadio('tbx-exp-format', value, label, opts.format === value, () => {
        opts.format = value
      }),
    )
  }

  const optionsWrap = document.createElement('div')
  optionsWrap.className = 'tbx-d-export-chat__opts'
  const checks: [keyof ChatExportOptions, string][] = [
    ['exportChatName', 'Export chat name'],
    ['exportParticipantNames', 'Export participant names'],
    ['exportMedia', 'Export media'],
    ['stableMedia', 'Stable media'],
    ['exportUtcTime', 'Export UTC time'],
    ['redactPhoneNumbers', 'Redact phone numbers'],
    ['onlyMyMessages', 'Only my messages'],
    ['excludeMyMessages', 'Exclude my messages'],
  ]
  for (const [key, label] of checks) {
    optionsWrap.appendChild(
      fieldCheckbox(label, Boolean(opts[key]), (v) => {
        opts[key] = v as never
      }),
    )
  }

  const dateRow = document.createElement('div')
  dateRow.className = 'tbx-d-export-chat__dates'
  const from = document.createElement('input')
  from.type = 'date'
  from.className = 'tbx-d-input'
  from.addEventListener('change', () => {
    opts.dateFrom = from.value
  })
  const to = document.createElement('input')
  to.type = 'date'
  to.className = 'tbx-d-input'
  to.addEventListener('change', () => {
    opts.dateTo = to.value
  })
  const dateLabel = document.createElement('span')
  dateLabel.className = 'tbx-d-export-chat__date-label'
  dateLabel.textContent = 'Date range'
  dateRow.append(dateLabel, from, document.createTextNode('–'), to)

  const actions = document.createElement('div')
  actions.className = 'tbx-d-form__actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'tbx-d-btn tbx-d-btn--ghost'
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', close)
  const exportBtn = document.createElement('button')
  exportBtn.type = 'button'
  exportBtn.className = 'tbx-d-btn tbx-d-btn--primary'
  exportBtn.textContent = 'Export'
  exportBtn.addEventListener('click', () => {
    if (busy) return
    if (!activeChatTitle()) return notify('Open a chat first')
    busy = true
    exportBtn.disabled = true
    notify('Exporting chat…')
    void exportChatMain(opts)
      .then((file) => {
        if (!file) return notify('Could not export (is WhatsApp fully loaded?)')
        downloadFile(file.filename, file.mime, file.content)
        notify('Chat exported')
        close()
      })
      .finally(() => {
        busy = false
        exportBtn.disabled = false
      })
  })

  actions.append(cancel, exportBtn)
  box.append(title, chatHint, formats, optionsWrap, dateRow, actions)
  overlay.appendChild(box)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  host.appendChild(overlay)
  exportBtn.focus()
}
