import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemoryField } from '@/core/form-memory/model'
import { runFormMemoryPage } from '@/chrome/content/formMemory/run'

const text = (label: string, value: string, extra: Partial<MemoryField> = {}): MemoryField => ({
  key: `text:${label}`,
  label,
  kind: 'text',
  value,
  updatedAt: 1,
  ...extra,
})

/** A Jenkins "Build with Parameters" item: every input is named `value`, help text sits between caption and box. */
const jenkinsParam = (label: string, description: string, control = '<input name="value" type="text" class="jenkins-input">') =>
  `<div class="jenkins-form-item tr"><div class="jenkins-form-label help-sibling">${label}</div>` +
  `<div class="jenkins-form-description">${description}</div><div class="setting-main"><div name="parameter">` +
  `<input name="name" type="hidden" value="${label}">${control}</div></div><div class="validation-error-area"></div></div>`

const JENKINS = `<form name="parameters">
  ${jenkinsParam('ProjectName', 'project name', '<select name="value"><option>eomsys</option><option>other</option></select>')}
  ${jenkinsParam('Environment', 'Environment Name, Ex: silver_dev001, gold_dev151, gold_at152, silver_infra002')}
  ${jenkinsParam('glue_code', 'Enter path for step definition implementation')}
  ${jenkinsParam('setup_owner', 'email address to receive the notification')}
</form>`

const valueOf = (selector: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value

describe('form memory labels and keys', () => {
  it('names a field by its caption, not the help text between them, and ignores a name every field shares', async () => {
    document.body.innerHTML = JENKINS
    document.querySelectorAll<HTMLInputElement>('input[type=text]').forEach((input, index) => (input.value = `v${index}`))
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.map((field) => [field.key, field.label, field.name])).toEqual([
      ['select:ProjectName', 'ProjectName', undefined],
      ['text:Environment', 'Environment', undefined],
      ['text:glue_code', 'glue_code', undefined],
      ['text:setup_owner', 'setup_owner', undefined],
    ])
  })

  it('labels a select that has a filter box beside it, and leaves the filter box out', async () => {
    document.body.innerHTML = `<div class="jenkins-form-item tr "><div class="jenkins-form-label help-sibling">branch_name</div>
      <div class="jenkins-form-description">Select a branch</div><div class="setting-main">
      <div id="choice-parameter-7012373449873923-spinner" class="ac-spinner"><p class="jenkins-spinner"></p></div>
      <div name="parameter" description="Select a branch" id="choice-parameter-7012373449873923" class="active-choice">
        <input name="name" type="hidden" value="branch_name">
        <div class="jenkins-select ac-ignore"><select name="value" class="jenkins-select__input">
          <option value="master">master</option><option value="develop" selected>develop</option></select></div>
        <input class="uno_choice_filter jenkins-input jenkins-!-margin-top-1" type="text" value="dev" name="test" placeholder="Filter">
      </div></div><div class="validation-error-area"></div></div>
      ${jenkinsParam('glue_code', 'Enter path for step definition implementation')}`
    document.querySelector<HTMLInputElement>('.jenkins-input:not(.uno_choice_filter)')!.value = 'com.telstra'
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.map((field) => [field.key, field.label, field.value])).toEqual([
      ['select:branch_name', 'branch_name', 'develop'],
      ['text:glue_code', 'glue_code', 'com.telstra'],
    ])
  })

  it('reads the name part of a caption block that also holds help text', async () => {
    document.body.innerHTML = `<div><div class="field-head"><label>Branch</label><small class="form-text">Pick the release branch</small></div>
      <div><input name="b" value="x"></div></div><div><input name="other"></div>`
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.[0].label).toBe('Branch')
  })

  it('treats text the field states as its description as help text', async () => {
    document.body.innerHTML = `<div><span>Region</span><span>Where the stack runs</span>
      <div data-description="Where the stack runs"><input name="r" value="au"></div></div>`
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.[0].label).toBe('Region')
  })

  it('treats a caption referenced by aria-describedby as help text', async () => {
    document.body.innerHTML = `<div><span>Coupon</span><span id="h">Leave blank if none</span>
      <input name="c" aria-describedby="h" value="X"></div>`
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.[0].label).toBe('Coupon')
  })

  it('drops screen-reader-only and required markers from captions', async () => {
    document.body.innerHTML = `
      <label for="f">First Name<span style="position:absolute;width:1px;height:1px;overflow:hidden"> . Required</span></label>
      <input id="f" name="f" value="Ann">
      <label for="l">Last Name . Required</label><input id="l" name="l" value="Lee">
      <table><thead><tr><th>Name \u2191</th></tr></thead><tbody><tr><td><input name="n" value="x"></td></tr></tbody></table>`
    const result = await runFormMemoryPage({ action: 'snapshot' })
    expect(result.fields?.map((field) => field.label)).toEqual(['First Name', 'Last Name', 'Name'])
  })
})

describe('form memory matching', () => {
  it('fills values from another job into the field with the same caption', async () => {
    document.body.innerHTML = JENKINS
    const result = await runFormMemoryPage({
      action: 'fill',
      shared: [text('setup_owner', 'jayaprakash.j@amdocs.com'), text('Environment', 'gold_dev050')],
    })
    expect(result.filled).toBe(2)
    const inputs = [...document.querySelectorAll<HTMLInputElement>('input[type=text]')].map((input) => input.value)
    expect(inputs).toEqual(['gold_dev050', '', 'jayaprakash.j@amdocs.com'])
  })

  it('does not put a value into every field that shares its name', async () => {
    document.body.innerHTML = JENKINS
    const result = await runFormMemoryPage({
      action: 'fill',
      shared: [text('email address to receive the notification', 'jayaprakash.j@amdocs.com', { name: 'value' })],
    })
    expect(result.filled).toBe(0)
    expect(valueOf('input[type=text]')).toBe('')
  })

  it('finds saved fields again when the framework renames them on the next visit', async () => {
    document.body.innerHTML = `
      <label for="a">First Name</label><input id="a" name="form-j_id_id7pc2-firstName">
      <label for="b">Source Type</label><select id="b" name="form-j_id_id7pc2-source"><option value="">Select One...</option><option value="sm">Social Media</option></select>`
    const fields: MemoryField[] = [
      text('First Name . Required', 'Jaya', { key: 'text:form-j_id_id16pc9-firstName', name: 'form-j_id_id16pc9-firstName' }),
      { key: 'select:form-j_id_id16pc9-source', label: 'Source Type. Required', kind: 'select', value: 'sm', updatedAt: 1 },
    ]
    const result = await runFormMemoryPage({ action: 'fill', fields })
    expect(result).toMatchObject({ filled: 2, matched: 2 })
    expect(valueOf('#a')).toBe('Jaya')
    expect(valueOf('#b')).toBe('sm')

    const cleared = await runFormMemoryPage({ action: 'clear', fields })
    expect(cleared.cleared).toBe(2)
    expect(valueOf('#a')).toBe('')
    expect(valueOf('#b')).toBe('')
  })

  it('tells same-captioned fields apart by their saved position', async () => {
    document.body.innerHTML = '<div><span>Name</span><input id="one"></div><div><span>Name</span><input id="two"></div>'
    const result = await runFormMemoryPage({
      action: 'fill',
      fields: [text('Name', 'second', { key: 'text:Old#2' }), text('Name', 'first', { key: 'text:Old' })],
    })
    expect(result.filled).toBe(2)
    expect([valueOf('#one'), valueOf('#two')]).toEqual(['first', 'second'])
  })
})

describe('form memory dependent lists', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills a list whose options load after the list above it is chosen', async () => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <label for="type">Source Type</label><select id="type" name="type"><option value="">Select One...</option><option value="sm">Social Media</option></select>
      <label for="media">Social Media</label><select id="media" name="media" disabled><option value="">Select One...</option></select>`
    const media = document.querySelector<HTMLSelectElement>('#media')!
    document.querySelector('#type')!.addEventListener('change', () => {
      window.setTimeout(() => {
        media.disabled = false
        media.add(new Option('LinkedIn', 'li'))
      }, 300)
    })
    const fields: MemoryField[] = [
      { key: 'select:type', label: 'Source Type', kind: 'select', value: 'sm', updatedAt: 1 },
      { key: 'select:media', label: 'Social Media', kind: 'select', value: 'li', updatedAt: 1 },
    ]
    const result = await runFormMemoryPage({ action: 'fill', fields, retry: true })
    expect(result.filled).toBe(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(media.value).toBe('li')
  })

  it('puts a select back to what the page first showed when clearing', async () => {
    document.body.innerHTML = `<label for="p">Primary Number</label>
      <select id="p" name="p"><option value="ns">Not Specified</option><option value="home">Home Phone</option></select>`
    const fields: MemoryField[] = [{ key: 'select:p', label: 'Primary Number', kind: 'select', value: 'home', updatedAt: 1 }]
    await runFormMemoryPage({ action: 'fill', fields })
    expect(valueOf('#p')).toBe('home')
    await runFormMemoryPage({ action: 'clear', fields })
    expect(valueOf('#p')).toBe('ns')
  })
})
