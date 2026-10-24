import { afterEach, describe, expect, it } from 'vitest'

import { extractReadablePage, extractSelection, pickContentRoot, textToBlocks } from '@/core/text/readablePage'
import {
  buildReader,
  chunkSentence,
  cleanForSpeech,
  estimateSeconds,
  formatClock,
  groupVoices,
  MAX_UTTERANCE_CHARS,
  pickAutoVoice,
  splitSentences,
  voiceLabel,
  wordAt,
} from '@/tools/text/read-aloud/speechText'

const filler = 'Saving early lets every deposit earn returns on previous returns. '.repeat(6)

function voice(partial: Partial<SpeechSynthesisVoice>): SpeechSynthesisVoice {
  return { default: false, localService: true, lang: 'en-US', name: 'Voice', voiceURI: partial.name ?? 'v', ...partial }
}

afterEach(() => {
  document.body.innerHTML = ''
  document.title = ''
})

describe('extractReadablePage', () => {
  it('keeps article blocks separate and drops page chrome', () => {
    document.title = 'Compound interest | QuickCalci'
    document.body.innerHTML = `
      <a class="sr-only" href="#main">Skip to main content</a>
      <header><a href="/">QuickCalci</a><nav><a href="/c">Categories</a><a href="/all">All Calculators</a></nav></header>
      <main id="main">
        <article>
          <h1>Compound interest</h1>
          <p>Compound interest grows your savings<a href="#fn1">[1]</a>. It is <strong>powerful</strong>.</p>
          <div>${filler}</div>
          <ul><li>First item</li><li>Second item</li></ul>
          <pre>const total = 1</pre>
          <button>Copy link</button>
          <div hidden>Hidden text</div>
          <div style="display:none">Invisible text</div>
          <aside>Related posts</aside>
        </article>
      </main>
      <footer>Copyright QuickCalci</footer>`

    const page = extractReadablePage(document)
    expect(page.title).toBe('Compound interest | QuickCalci')
    expect(page.blocks).toEqual([
      { type: 'heading', text: 'Compound interest' },
      { type: 'paragraph', text: 'Compound interest grows your savings[1]. It is powerful.' },
      { type: 'paragraph', text: filler.trim() },
      { type: 'list', text: 'First item' },
      { type: 'list', text: 'Second item' },
      { type: 'code', text: 'const total = 1' },
    ])
  })

  it('adds the page title when the content has no leading heading', () => {
    document.title = 'Release notes'
    document.body.innerHTML = `<main><p>${filler}</p><p>Second paragraph here.</p></main>`
    const page = extractReadablePage(document)
    expect(page.blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'paragraph'])
    expect(page.blocks[0].text).toBe('Release notes')
  })

  it('prefers the longest article over the surrounding page', () => {
    document.body.innerHTML = `<div id="side"><p>Sidebar text</p></div><article id="post"><p>${filler}${filler}</p></article>`
    expect(pickContentRoot(document).id).toBe('post')
  })

  it('reads only the current selection', () => {
    document.body.innerHTML = '<p id="a">First paragraph.</p><p id="b">Second paragraph.</p>'
    const range = document.createRange()
    range.selectNodeContents(document.getElementById('b')!)
    document.getSelection()!.removeAllRanges()
    document.getSelection()!.addRange(range)
    expect(extractSelection(document).blocks).toEqual([{ type: 'paragraph', text: 'Second paragraph.' }])
  })
})

describe('textToBlocks', () => {
  it('uses blank lines as paragraph breaks when present', () => {
    expect(textToBlocks('Para one\nwrapped line\n\nPara two').map((block) => block.text)).toEqual([
      'Para one wrapped line',
      'Para two',
    ])
  })

  it('falls back to one paragraph per line', () => {
    expect(textToBlocks('Line one\nLine two\n').map((block) => block.text)).toEqual(['Line one', 'Line two'])
  })
})

describe('speech text', () => {
  it('drops links and citation marks', () => {
    expect(cleanForSpeech('Visit https://example.com.', { skipUrls: true, skipCitations: false })).toBe('Visit.')
    expect(
      cleanForSpeech('See https://example.com/a?b=1 for more[2]. Also www.test.dev [citation needed].', {
        skipUrls: true,
        skipCitations: true,
      }),
    ).toBe('See for more. Also.')
  })

  it('splits sentences and keeps every utterance short', () => {
    expect(splitSentences('Hello world. How are you? Fine!')).toEqual(['Hello world.', 'How are you?', 'Fine!'])
    const long = `${'word, '.repeat(80)}end.`
    const chunks = chunkSentence(long)
    expect(chunks.every((chunk) => chunk.length <= MAX_UTTERANCE_CHARS)).toBe(true)
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long.replace(/\s+/g, ' '))
  })

  it('builds numbered segments and skips code unless asked', () => {
    const blocks = [
      { type: 'heading' as const, text: 'Title' },
      { type: 'paragraph' as const, text: 'One sentence. Two sentence.' },
      { type: 'code' as const, text: 'npm run build' },
    ]
    const model = buildReader(blocks, { skipUrls: true, skipCitations: true, readCode: false })
    expect(model.segments.map((segment) => [segment.index, segment.block, segment.text])).toEqual([
      [0, 0, 'Title'],
      [1, 1, 'One sentence.'],
      [2, 1, 'Two sentence.'],
    ])
    expect(model.blocks[2]).toMatchObject({ type: 'code', skipped: true, segments: [] })
    expect(model.words).toBe(5)

    const withCode = buildReader(blocks, { skipUrls: true, skipCitations: true, readCode: true })
    expect(withCode.segments.at(-1)?.text).toBe('npm run build')
  })

  it('estimates listening time', () => {
    expect(estimateSeconds(170, 1)).toBe(60)
    expect(estimateSeconds(170, 2)).toBe(30)
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(3725)).toBe('1:02:05')
  })

  it('finds the spoken word from a boundary event', () => {
    expect(wordAt('Read this aloud', 5)).toEqual({ start: 5, end: 9 })
    expect(wordAt('Read this aloud', 5, 4)).toEqual({ start: 5, end: 9 })
    expect(wordAt('Read', 10)).toBeNull()
  })
})

describe('voices', () => {
  const voices = [
    voice({ name: 'Microsoft Aria Online (Natural) - English (United States)', voiceURI: 'aria', localService: false }),
    voice({ name: 'Microsoft David - English (United States)', voiceURI: 'david', default: true }),
    voice({ name: 'Google français', voiceURI: 'fr', lang: 'fr-FR', localService: false }),
    voice({ name: 'Google UK English Female', voiceURI: 'uk', lang: 'en-GB', localService: false }),
  ]

  it('groups by language with the preferred language first', () => {
    const groups = groupVoices(voices, ['fr-FR'])
    expect(groups.map((group) => group.lang)).toEqual(['fr', 'en'])
    expect(groups[1].voices[0].voiceURI).toBe('david')
  })

  it('shortens voice names and picks a voice for the text language', () => {
    expect(voiceLabel(voices[0])).toBe('Microsoft Aria Online (Natural)')
    expect(pickAutoVoice(voices, 'en-GB')?.voiceURI).toBe('uk')
    expect(pickAutoVoice(voices, 'fr')?.voiceURI).toBe('fr')
    expect(pickAutoVoice(voices, 'de-DE')?.voiceURI).toBe('david')
  })
})
