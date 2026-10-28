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
