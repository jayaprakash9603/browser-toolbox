import { describe, expect, it } from 'vitest'

import {
  applyEdit,
  caretPosition,
  continueList,
  findMatches,
  lineOffset,
  markdownToHtml,
  markdownToPlain,
  noteDisplayTitle,
  noteToMarkdown,
  notesToBackup,
  parseBackup,
  replaceAll,
  safeFilename,
  textFileToNote,
  textStats,
  toggleCheckboxAtLine,
  toggleLinePrefix,
  wrapSelection,
} from '@/tools/productivity/notes/notesFormat'
import { normalizeNote, sortNotes } from '@/tools/productivity/notes/notesService'

const opts = { matchCase: false, wholeWord: false }

describe('notes formatting edits', () => {
  it('wraps and unwraps a selection', () => {
    const text = 'hello world'
    const edit = wrapSelection(text, 6, 11, '**')
    const bolded = applyEdit(text, edit)
    expect(bolded).toBe('hello **world**')
    expect(bolded.slice(edit.selStart, edit.selEnd)).toBe('world')
    expect(applyEdit(bolded, wrapSelection(bolded, edit.selStart, edit.selEnd, '**'))).toBe(text)
  })

  it('places the caret between markers for an empty selection', () => {
    const edit = wrapSelection('ab', 1, 1, '<u>', '</u>')
    expect(applyEdit('ab', edit)).toBe('a<u></u>b')
    expect(edit.selStart).toBe(4)
  })

  it('toggles bullet, numbered and checklist prefixes across lines', () => {
    const text = 'one\ntwo\nthree'
    const bullets = applyEdit(text, toggleLinePrefix(text, 0, text.length, 'bullet'))
    expect(bullets).toBe('- one\n- two\n- three')
    const numbered = applyEdit(bullets, toggleLinePrefix(bullets, 0, bullets.length, 'ordered'))
    expect(numbered).toBe('1. one\n2. two\n3. three')
    const checks = applyEdit(numbered, toggleLinePrefix(numbered, 0, numbered.length, 'check'))
    expect(checks).toBe('- [ ] one\n- [ ] two\n- [ ] three')
    expect(applyEdit(checks, toggleLinePrefix(checks, 0, checks.length, 'check'))).toBe(text)
  })

  it('only touches the caret line for a single-line toggle', () => {
    const text = 'a\nb\nc'
    expect(applyEdit(text, toggleLinePrefix(text, 2, 2, 'heading'))).toBe('a\n## b\nc')
  })

  it('continues and ends lists on Enter', () => {
    expect(applyEdit('- item', continueList('- item', 6)!)).toBe('- item\n- ')
    expect(applyEdit('3. item', continueList('3. item', 7)!)).toBe('3. item\n4. ')
    expect(applyEdit('- [x] done', continueList('- [x] done', 10)!)).toBe('- [x] done\n- [ ] ')
    expect(applyEdit('a\n- ', continueList('a\n- ', 4)!)).toBe('a\n')
    expect(continueList('plain', 5)).toBeNull()
  })

  it('toggles a checkbox by line index', () => {
    expect(toggleCheckboxAtLine('x\n- [ ] task', 1)).toBe('x\n- [x] task')
    expect(toggleCheckboxAtLine('- [x] task', 0)).toBe('- [ ] task')
  })
})

describe('notes stats and navigation', () => {
  it('counts words, characters and lines', () => {
    expect(textStats('hello india\nindia')).toEqual({ words: 3, characters: 17, lines: 2 })
    expect(textStats('')).toEqual({ words: 0, characters: 0, lines: 1 })
  })

  it('reports caret line/column and line offsets', () => {
    expect(caretPosition('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
    expect(lineOffset('ab\ncd\nef', 3)).toBe(6)
    expect(lineOffset('ab', 9)).toBe(2)
  })
})

describe('find and replace', () => {
  it('finds case-insensitively by default and honours options', () => {
    const text = 'India india INDIAN'
    expect(findMatches(text, 'india', opts)).toHaveLength(3)
    expect(findMatches(text, 'india', { ...opts, matchCase: true })).toEqual([{ start: 6, end: 11 }])
    expect(findMatches(text, 'india', { ...opts, wholeWord: true })).toHaveLength(2)
  })

  it('treats the query literally', () => {
    expect(findMatches('a.b axb', 'a.b', opts)).toEqual([{ start: 0, end: 3 }])
  })

  it('replaces every match and reports the count', () => {
    expect(replaceAll('cat Cat cat', 'cat', 'dog', opts)).toEqual({ text: 'dog dog dog', count: 3 })
    expect(replaceAll('$1 x', 'x', '$&$&', opts).text).toBe('$1 $&$&')
  })
})

describe('markdown rendering', () => {
  it('renders headings, emphasis, lists and checkboxes', () => {
    const html = markdownToHtml('# Title\n**b** *i* ~~s~~ <u>u</u>\n- [x] done\n- item\n1. first', {
      interactive: true,
    })
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>b</strong> <em>i</em> <del>s</del> <u>u</u>')
    expect(html).toContain('<input type="checkbox" checked data-line="2">')
    expect(html).toContain('<li>item</li>')
    expect(html).toContain('<ol>\n<li>first</li>')
  })

  it('escapes HTML and refuses unsafe links', () => {
    const html = markdownToHtml('<img src=x onerror=alert(1)> [x](javascript:alert(1)) [ok](https://a.com)')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('href="javascript')
    expect(html).toContain('href="https://a.com"')
  })

  it('keeps code spans literal', () => {
    expect(markdownToHtml('`**not bold**`')).toContain('<code>**not bold**</code>')
  })

  it('strips markdown to plain text', () => {
    expect(markdownToPlain('## Head\n- [ ] task\n**bold** [l](https://x.y)')).toBe('Head\n☐ task\nbold l (https://x.y)')
  })
})

describe('note import/export helpers', () => {
  const note = normalizeNote({ id: 'a', title: '', body: '**Groceries**\nmilk', updatedAt: 1, createdAt: 1 })

  it('derives a display title from the body when untitled', () => {
    expect(noteDisplayTitle(note, 'Untitled')).toBe('Groceries')
    expect(noteDisplayTitle({ title: '', body: '' }, 'Untitled')).toBe('Untitled')
  })

  it('round-trips markdown export through text import', () => {
    const titled = { ...note, title: 'Shopping' }
    expect(textFileToNote('x.md', noteToMarkdown(titled, 'Shopping'))).toEqual({ title: 'Shopping', body: note.body })
    expect(textFileToNote('todo.txt', 'a\r\nb')).toEqual({ title: 'todo', body: 'a\nb' })
  })

  it('round-trips JSON backups and rejects junk', () => {
    expect(parseBackup(notesToBackup([note]))[0]).toMatchObject({ id: 'a', body: note.body })
    expect(() => parseBackup('{"foo":1}')).toThrow()
  })

  it('sanitises filenames', () => {
    expect(safeFilename('a/b:c*?"<>|')).toBe('a b c')
    expect(safeFilename('   ')).toBe('note')
  })

  it('normalises legacy notes and sorts pinned first', () => {
    const legacy = normalizeNote({ id: 'old', title: 'Old', body: '', pinned: false, updatedAt: 5 })
    expect(legacy).toMatchObject({ color: 'default', createdAt: 5 })
    const pinned = normalizeNote({ id: 'p', title: 'Zed', pinned: true, updatedAt: 1 })
    expect(sortNotes([legacy, pinned], 'modified').map((n) => n.id)).toEqual(['p', 'old'])
    expect(sortNotes([pinned, legacy], 'title').map((n) => n.id)).toEqual(['p', 'old'])
  })
})
