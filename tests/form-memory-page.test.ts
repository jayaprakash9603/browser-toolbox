import { afterEach, describe, expect, it, vi } from 'vitest'

import { runFormMemoryPage } from '@/chrome/background/formMemory/page'

async function snapshot(html: string) {
  document.body.innerHTML = html
  const result = await runFormMemoryPage({ action: 'snapshot' })
  expect(result.ok).toBe(true)
  return result.fields ?? []
}

async function labelOf(html: string): Promise<string | undefined> {
  return (await snapshot(html))[0]?.label
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('form memory label detection', () => {
  it('reads a div caption separated from its field by a delimiter', async () => {
    const fields = await snapshot(`
      <div class="field">
        <div class="label" title="Reason">Reason</div>
        <div class="delimiter">:</div>
        <textarea class="input">Moving house</textarea>
        <div class="validationMessages"><span>This field is required</span></div>
      </div>`)
    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({ key: 'textarea:Reason', label: 'Reason', value: 'Moving house' })
  })

  it('reads the caption cell of a table row', async () => {
    expect(await labelOf('<table><tr><td>First name</td><td><input name="fn" value="Jaya"></td></tr></table>')).toBe(
      'First name',
    )
  })

  it('reads labels that wrap the field or sit beside it without a for attribute', async () => {
    expect(await labelOf('<label>Email: <input name="e" value="a@b.co"></label>')).toBe('Email')
    expect(await labelOf('<div><label>Phone</label><input name="p" value="123"></div>')).toBe('Phone')
  })

  it('ignores required markers between the caption and the field', async () => {
    expect(await labelOf('<div><span>Name</span><span class="req">*</span><input name="n" value="x"></div>')).toBe('Name')
  })

  it('falls back to the column header when a row holds several fields', async () => {
    const fields = await snapshot(`
      <table>
        <thead><tr><th>Qty</th><th>Price</th></tr></thead>
        <tbody><tr><td><input name="qty" value="2"></td><td><input name="price" value="9"></td></tr></tbody>
      </table>`)
    expect(fields.map((field) => field.label)).toEqual(['Qty', 'Price'])
  })

  it('prefers the placeholder over a distant section title', async () => {
    expect(
      await labelOf('<section><h2>Trip</h2><div><div><div><input name="q" placeholder="Search city" value="Pune"></div></div></div></section>'),
    ).toBe('Search city')
  })

  it('names a radio group by its question, not by an option caption', async () => {
    const fields = await snapshot(`
      <div>
        <div class="q">Gender</div>
        <div>
          <input type="radio" name="g" value="m" id="m"><label for="m">Male</label>
          <input type="radio" name="g" value="f" id="f" checked><label for="f">Female</label>
        </div>
      </div>`)
    expect(fields[0]).toMatchObject({ kind: 'radio', label: 'Gender', value: 'f', display: 'Female' })
  })

  it('reads the caption that follows a checkbox', async () => {
    const fields = await snapshot(`
      <div><input type="checkbox" name="news" checked><span>Send me news</span></div>
      <div><input type="checkbox" name="terms" checked><span>I agree to the terms</span></div>`)
    expect(fields.map((field) => field.label)).toEqual(['Send me news', 'I agree to the terms'])
  })

  it('turns a field name into words when nothing else names it', async () => {
    expect(await labelOf('<input name="billingAddress" value="1 Main St">')).toBe('Billing address')
  })

  it('keys fields with generated ids by their label so the key survives a reload', async () => {
    const fields = await snapshot('<div><div>City</div><input id=":r5:" value="Pune"></div>')
    expect(fields[0]).toMatchObject({ key: 'text:City', label: 'City' })
  })

  it('reads non-Latin captions', async () => {
    expect(await labelOf('<div><div>\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD</div><input name="n" value="x"></div>')).toBe(
      '\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD',
    )
  })
})

const ITEMS = ['GDC - BAU', 'GDC - DIS', 'RDC - TPM']

/** The div dropdown from the user's portal: a read-only box, an icon and a popup list with its own filter box. */
function divDropdown(value = '', popupStyle = '') {
  const items = ITEMS.map(
    (item) => `<div data-uxf-point="uxf-collection-item">
      <div data-uxf-point="CodeDecodeItem" class="popupItem" title="${item}"><div class="popupItemText">${item}</div></div>
      <div class="separator"></div>
      <div data-uxf-point="validationMessages"><div class="validationMessages"><div></div></div></div>
    </div>`,
  )
  return `<div class="field additionalDetails.deliveryResourceType">
    <div class="label" title="Deliver Resource Type">Deliver Resource Type</div>
    <div class="delimiter">:</div>
    <div class="input inputWithIcon">
      <input maxlength="256" readonly="" data-input="mandatory" class="combo" value="${value}">
      <div class="icon" data-uxf-point="selectOptionsToggle"></div>
      <div class="clear"></div>
      <div data-uxf-point="filterSelectionOptions" class="popupHost" style="${popupStyle}">
        <div class="filterSelectionList popup">
          <div data-uxf-point="filters"><div class="filter string"><div class="label"></div>
            <input type="text" class="string-input" value="gdc"></div></div>
          <div class="selectionList">${items.join('')}</div>
        </div>
      </div>
    </div>
    <div class="clear"></div>
    <div data-uxf-point="validationMessages"><div class="validationMessages"><div></div></div></div>
  </div>`
}

function wireDropdown(opener: 'box' | 'icon') {
  const box = document.querySelector<HTMLInputElement>('input.combo')!
  const popup = document.querySelector<HTMLElement>('.popupHost')!
  const picked: string[] = []
  document.querySelector(opener === 'box' ? 'input.combo' : '.icon')!.addEventListener('click', () => {
    popup.style.display = 'block'
  })
  for (const item of document.querySelectorAll<HTMLElement>('.popupItem')) {
    item.addEventListener('click', () => {
      picked.push(item.title)
      box.value = item.title
      popup.style.display = 'none'
    })
  }
  return { box, picked }
}

const DROPDOWN_FIELD = { key: 'text:Deliver Resource Type', label: 'Deliver Resource Type', kind: 'text' as const, value: 'GDC - DIS', updatedAt: 1 }

describe('form memory controls built from divs', () => {
  it('labels a div dropdown and ignores the filter box inside its popup', async () => {
    const fields = await snapshot(divDropdown('GDC - BAU', 'display:none'))
    expect(fields).toEqual([
      expect.objectContaining({ key: 'text:Deliver Resource Type', label: 'Deliver Resource Type', value: 'GDC - BAU' }),
    ])
  })

  it.each(['box', 'icon'] as const)('fills a div dropdown by clicking its item, opened from the %s', async (opener) => {
    document.body.innerHTML = divDropdown('', 'display:none')
    const { box, picked } = wireDropdown(opener)
    const result = await runFormMemoryPage({ action: 'fill', fields: [DROPDOWN_FIELD], overwrite: true })
    expect(result.filled).toBe(1)
    expect(picked).toEqual(['GDC - DIS'])
    expect(box.value).toBe('GDC - DIS')
  })

  it('reads and toggles an ARIA checkbox', async () => {
    const html = '<div><div role="checkbox" aria-checked="true" tabindex="0"></div><span>Hot Cutover</span></div>'
    const fields = await snapshot(html)
    expect(fields[0]).toMatchObject({ key: 'checkbox:Hot Cutover', kind: 'checkbox', label: 'Hot Cutover', value: true })
    const box = document.querySelector<HTMLElement>('[role=checkbox]')!
    box.addEventListener('click', () => box.setAttribute('aria-checked', String(box.getAttribute('aria-checked') !== 'true')))
    await runFormMemoryPage({ action: 'fill', fields: [{ ...fields[0], value: false, updatedAt: 1 }] })
    expect(box.getAttribute('aria-checked')).toBe('false')
  })

  it('reads a div combobox and picks from a list rendered elsewhere in the page', async () => {
    const fields = await snapshot('<div><span>Colour</span><div role="combobox" aria-haspopup="listbox" tabindex="0">Red</div></div>')
    expect(fields[0]).toMatchObject({ key: 'select:Colour', kind: 'select', label: 'Colour', value: 'Red' })
    const combo = document.querySelector<HTMLElement>('[role=combobox]')!
    combo.addEventListener('click', () => {
      const list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      list.innerHTML = '<li role="option">Red</li><li role="option">Blue</li>'
      list.addEventListener('click', (event) => {
        combo.textContent = (event.target as HTMLElement).textContent
        list.remove()
      })
      document.body.append(list)
    })
    const result = await runFormMemoryPage({ action: 'fill', fields: [{ ...fields[0], value: 'Blue', updatedAt: 1 }], overwrite: true })
    expect(result.filled).toBe(1)
    expect(combo.textContent).toBe('Blue')
  })

  it('reads a contenteditable text box', async () => {
    const fields = await snapshot('<div><span id="n">Notes</span><div contenteditable="true" aria-labelledby="n">Call back</div></div>')
    expect(fields[0]).toMatchObject({ kind: 'textarea', label: 'Notes', value: 'Call back' })
  })

  it('ignores the month and year selects of a calendar popup', async () => {
    const days = Array.from({ length: 31 }, (_, index) => `<td><a href="#">${index + 1}</a></td>`).join('')
    const fields = await snapshot(`
      <div><label for="d">Date</label><input id="d" name="dob" readonly value="29-Oct-2026"></div>
      <div class="calendar"><div class="title">
        <select name="month"><option selected>Oct</option></select><select name="year"><option selected>2026</option></select>
      </div><table><tbody><tr>${days}</tr></tbody></table></div>`)
    expect(fields.map((field) => field.name)).toEqual(['dob'])
  })
})

describe('form memory fill', () => {
  it('fills a read-only date picker input', async () => {
    document.body.innerHTML = '<div><label for="d">Date</label><input id="d" name="dob" readonly></div>'
    const result = await runFormMemoryPage({
      action: 'fill',
      fields: [{ key: 'text:dob', label: 'Date', kind: 'text', value: '29-Oct-2026', updatedAt: 1 }],
    })
    expect(result.filled).toBe(1)
    expect(document.querySelector<HTMLInputElement>('#d')?.value).toBe('29-Oct-2026')
  })

  it('leaves read-only values it did not fill when clearing', async () => {
    document.body.innerHTML = '<input name="ref" readonly value="AB-1"><input name="dob" readonly value="29-Oct-2026">'
    const result = await runFormMemoryPage({
      action: 'clear',
      fields: [{ key: 'text:dob', label: 'Date', kind: 'text', value: '29-Oct-2026', updatedAt: 1 }],
    })
    expect(result.cleared).toBe(1)
    expect(document.querySelector<HTMLInputElement>('[name=ref]')?.value).toBe('AB-1')
    expect(document.querySelector<HTMLInputElement>('[name=dob]')?.value).toBe('')
  })

  it('does not send its own fill or clear back as something the user typed', async () => {
    vi.useFakeTimers()
    const runtime = chrome.runtime as unknown as { id?: string; sendMessage: ReturnType<typeof vi.fn> }
    runtime.id = 'test'
    runtime.sendMessage.mockClear()
    try {
      document.body.innerHTML = '<div><input type="checkbox" name="cutover" checked><span>Hot Cutover</span></div>'
      const saved = [{ key: 'checkbox:cutover', label: 'Hot Cutover', kind: 'checkbox' as const, value: true, updatedAt: 1 }]
      await runFormMemoryPage({ action: 'inspect', watch: true })
      await runFormMemoryPage({ action: 'clear', fields: saved })
      await runFormMemoryPage({ action: 'fill', fields: saved, overwrite: true })
      await vi.advanceTimersByTimeAsync(2000)
      expect(runtime.sendMessage).not.toHaveBeenCalled()

      document.querySelector<HTMLInputElement>('input')!.dispatchEvent(new Event('change', { bubbles: true }))
      document.querySelector<HTMLInputElement>('input')!.click()
      await vi.advanceTimersByTimeAsync(2000)
      expect(runtime.sendMessage).toHaveBeenCalledTimes(1)
    } finally {
      delete runtime.id
      delete (window as unknown as { __tbxFormMemory?: unknown }).__tbxFormMemory
      vi.useRealTimers()
    }
  })

  it('fills and counts only the fields shown on screen', async () => {
    document.body.innerHTML = `
      <label for="name">Name</label><input id="name" name="name">
      <section style="display:none"><label for="code">Code</label><input id="code" name="code"></section>
      <div hidden><label for="owner">Owner</label><input id="owner" name="owner"></div>`
    const field = (name: string) => ({ key: `text:${name}`, label: name, kind: 'text' as const, value: `${name}-1`, updatedAt: 1 })
    const result = await runFormMemoryPage({ action: 'fill', fields: ['name', 'code', 'owner'].map(field), overwrite: true })
    expect(result).toMatchObject({ filled: 1, total: 1, matched: 1, populated: 1 })
    expect(document.querySelector<HTMLInputElement>('#code')?.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('#owner')?.value).toBe('')
  })

  it('clears only visible fields holding saved or global values', async () => {
    document.body.innerHTML = `
      <label for="name">Name</label><input id="name" name="name" value="Ann">
      <label for="note">Note</label><input id="note" name="note" value="typed by hand">
      <label for="email">Email</label><input id="email" name="email" autocomplete="email" value="a@b.co">
      <div style="display:none"><label for="code">Code</label><input id="code" name="code" value="X1"></div>`
    const result = await runFormMemoryPage({
      action: 'clear',
      fields: [
        { key: 'text:name', label: 'Name', kind: 'text', value: 'Ann', updatedAt: 1 },
        { key: 'text:code', label: 'Code', kind: 'text', value: 'X1', updatedAt: 1 },
      ],
      shared: [{ key: 'text:email', label: 'Email', kind: 'text', value: 'a@b.co', auto: 'email', updatedAt: 1 }],
    })
    expect(result.cleared).toBe(2)
    expect(document.querySelector<HTMLInputElement>('#name')?.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('#email')?.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('#note')?.value).toBe('typed by hand')
    expect(document.querySelector<HTMLInputElement>('#code')?.value).toBe('X1')
  })

  it('treats a styled checkbox whose real input is hidden as visible', async () => {
    document.body.innerHTML = `
      <div><input type="checkbox" id="agree" name="agree" style="display:none"><label for="agree">I agree</label></div>`
    const result = await runFormMemoryPage({
      action: 'fill',
      fields: [{ key: 'checkbox:agree', label: 'I agree', kind: 'checkbox', value: true, updatedAt: 1 }],
    })
    expect(result).toMatchObject({ filled: 1, total: 1 })
    expect(document.querySelector<HTMLInputElement>('#agree')?.checked).toBe(true)
  })

  it('captures picked files with their contents', async () => {
    document.body.innerHTML = '<div><span>Resume</span><input type="file" name="cv"></div>'
    const input = document.querySelector<HTMLInputElement>('input')!
    Object.defineProperty(input, 'files', { value: [new File(['hello'], 'cv.txt', { type: 'text/plain' })] })
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.[0]).toMatchObject({
      key: 'file:cv',
      kind: 'file',
      label: 'Resume',
      value: ['cv.txt'],
      files: [{ name: 'cv.txt', type: 'text/plain', size: 5, data: btoa('hello') }],
    })
  })
})
