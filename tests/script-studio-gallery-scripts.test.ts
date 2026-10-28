import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { upgradeGalleryScripts } from '@/chrome/background/script-studio/gallery'
import {
  getScriptCode,
  getScriptStudioIndex,
  isBrowserRestrictedUrl,
  recordFromSource,
  setScriptCode,
  setScriptStudioIndex,
  DEFAULT_SCRIPT_STUDIO_INDEX,
} from '@/core/script-studio'
import { GALLERY_SCRIPTS, galleryInstallUrl } from '@/core/script-studio/gallery'

type Globals = typeof globalThis & {
  __ssNote?: (text: string) => void
  GM_getValue?: (key: string, fallback?: unknown) => unknown
  GM_setValue?: (key: string, value: unknown) => void
}
const g = globalThis as Globals

function gallery(id: string) {
  const script = GALLERY_SCRIPTS.find((s) => s.id === id)
  if (!script) throw new Error(`missing gallery script ${id}`)
  return script
}

function run(id: string) {
  new Function(gallery(id).code)()
}

function press(code: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { code, altKey: true, shiftKey: true, bubbles: true }))
}

const note = vi.fn()

beforeEach(() => {
  note.mockReset()
  g.__ssNote = note
})

afterEach(() => {
  document.querySelectorAll('style').forEach((el) => el.remove())
  document.body.removeAttribute('style')
  delete g.__ssNote
})

describe('Copy Page as Markdown', () => {
  const writeText = vi.fn()

  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    g.__ssNote = note
    run('copy-markdown-link')
  })

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined)
    document.title = 'Guide'
    document.body.innerHTML = `
      <header><nav><a href="/">Home</a></nav></header>
      <main>
        <h1>Guide</h1>
        <p>Hello <strong>world</strong> and <a href="https://x.test/a">a link</a>.</p>
        <ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>
        <pre><code class="language-js">const a = 1</code></pre>
        <table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>
        <button>Buy</button>
        <div style="display:flex"><a href="https://x.test/b">B</a><a href="https://x.test/c">C</a></div>
        <a href="https://x.test/card"><h3>Card title</h3><p>Card text</p></a>
        <span aria-label="305+"><span aria-hidden="true">305+</span></span>
        <div aria-hidden="true">Marquee copy</div>
      </main>
      <footer>Footer links</footer>`
  })

  it('copies the whole page as Markdown and reports the result', async () => {
    press('KeyM')
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled())
    const md = writeText.mock.calls[0][0] as string
    expect(md.startsWith('# Guide\n\nHello **world** and [a link](https://x.test/a).')).toBe(true)
    expect(md).toContain('- One\n- Two\n  - Nested')
    expect(md).toContain('```js\nconst a = 1\n```')
    expect(md).toContain('| A | B |\n| --- | --- |\n| 1 | 2 |')
    expect(md).toContain('[B](https://x.test/b) [C](https://x.test/c)')
    expect(md).toContain('### [Card title](https://x.test/card)\n\nCard text')
    expect(md).toContain('305+')
    expect(md).toContain(`Source: ${location.href}`)
    expect(md).not.toMatch(/Home|Footer links|Buy|Marquee copy/)
    await vi.waitFor(() => expect(note).toHaveBeenLastCalledWith(expect.stringMatching(/^Copied the page as Markdown: \d+ words/)))
  })

  it('copies only the selection when there is one', async () => {
    const range = document.createRange()
    range.selectNodeContents(document.querySelector('ul')!)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    press('KeyM')
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toBe('- One\n- Two\n  - Nested')
    window.getSelection()!.removeAllRanges()
  })

  it('copies just the link with Alt+Shift+L', async () => {
    press('KeyL')
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(`[Guide](${location.href})`))
  })
})

describe('JSON Pretty Viewer', () => {
  it('formats a raw JSON page with colours and a summary', () => {
    document.body.innerHTML = '<pre>{"a":1,"b":[true,null]}</pre>'
    run('json-viewer')
    const view = document.getElementById('op-json')!
    expect(view.textContent).toContain('"a": 1')
    expect(view.querySelector('.k')?.textContent).toBe('"a"')
    expect(document.getElementById('op-json-bar')?.textContent).toContain('Object with 2 keys')
    expect(note).toHaveBeenCalledWith(expect.stringContaining('Formatted this JSON response'))
  })

  it('leaves normal pages alone and says why', () => {
    document.body.innerHTML = '<div>Hello</div>'
    run('json-viewer')
    expect(document.getElementById('op-json')).toBeNull()
    expect(note).toHaveBeenCalledWith(expect.stringContaining('not a raw JSON response'))
  })
})

describe('Dark Mode Everywhere', () => {
  let values: Record<string, unknown>

  beforeEach(() => {
    values = {}
    g.GM_getValue = (key, fallback) => (key in values ? values[key] : fallback)
    g.GM_setValue = (key, value) => {
      values[key] = value
    }
  })

  afterEach(() => {
    delete g.GM_getValue
    delete g.GM_setValue
  })

  const darkStyle = () => [...document.querySelectorAll('style')].find((s) => s.textContent?.includes('invert(1)'))

  it('turns on by itself and the shortcut switches it off for the site', () => {
    run('dark-mode-everywhere')
    expect(darkStyle()).toBeDefined()
    expect(note).toHaveBeenCalledWith(expect.stringContaining('Dark mode is on'))
    press('KeyD')
    expect(darkStyle()).toBeUndefined()
    expect(values[`site:${location.hostname}`]).toBe('off')
  })

  it('stays off on sites the user switched off', () => {
    values[`site:${location.hostname}`] = 'off'
    run('dark-mode-everywhere')
    expect(darkStyle()).toBeUndefined()
  })

  it('backs off on sites that are already dark', () => {
    document.body.style.backgroundColor = 'rgb(12, 12, 14)'
    run('dark-mode-everywhere')
    window.dispatchEvent(new Event('load'))
    expect(darkStyle()).toBeUndefined()
    expect(note).toHaveBeenLastCalledWith(expect.stringContaining('already has a dark theme'))
  })
})

describe('browser-restricted pages', () => {
  it('recognises store pages where Chrome blocks extensions', () => {
    expect(isBrowserRestrictedUrl('https://chromewebstore.google.com/detail/x/abc')).toBe(true)
    expect(isBrowserRestrictedUrl('https://chrome.google.com/webstore/detail/abc')).toBe(true)
    expect(isBrowserRestrictedUrl('https://microsoftedge.microsoft.com/addons/detail/abc')).toBe(true)
    expect(isBrowserRestrictedUrl('https://www.google.com/search?q=webstore')).toBe(false)
  })
})

describe('gallery upgrades', () => {
  it('replaces an older installed copy with the bundled version once', async () => {
    const latest = gallery('copy-markdown-link')
    const old = latest.code.replace(/@version\s+\S+/, '@version      1.0.0')
    const record = recordFromSource('g1', old, { installUrl: galleryInstallUrl(latest.id), enabled: false })
    await setScriptStudioIndex({ ...DEFAULT_SCRIPT_STUDIO_INDEX, scripts: [record] })
    await setScriptCode('g1', old)

    expect(await upgradeGalleryScripts()).toBe(1)
    expect(await getScriptCode('g1')).toBe(latest.code)
    const [upgraded] = (await getScriptStudioIndex()).scripts
    expect(upgraded).toMatchObject({ name: 'Copy Page as Markdown', version: '1.2.0', enabled: false })
    expect(await upgradeGalleryScripts()).toBe(0)
  })
})
