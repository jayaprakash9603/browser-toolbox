import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BoldIcon,
  CalendarClockIcon,
  CodeIcon,
  EyeIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  PencilIcon,
  QuoteIcon,
  Redo2Icon,
  SearchIcon,
  SlidersHorizontalIcon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { FindBar, type FindMode } from './FindBar'
import { NOTE_COLOR_STYLES } from './noteColors'
import {
  applyEdit,
  caretPosition,
  continueList,
  findMatches,
  lineOffset,
  markdownToHtml,
  replaceAll,
  textStats,
  toggleCheckboxAtLine,
  toggleLinePrefix,
  wrapSelection,
  type FindOptions,
  type LineKind,
  type TextEdit,
} from './notesFormat'
import type { Note, NotesFont, NotesPrefs } from './notesService'

const FONT_CLASS: Record<NotesFont, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
}

const SURFACE = 'm-0 block h-full w-full px-3 py-2 leading-relaxed break-words'
const MAX_HIGHLIGHTS = 2000

const PROSE =
  '[&_h1]:mb-2 [&_h1]:text-[1.5em] [&_h1]:font-semibold [&_h2]:mb-1.5 [&_h2]:text-[1.25em] [&_h2]:font-semibold [&_h3]:text-[1.1em] [&_h3]:font-semibold [&_h4]:font-semibold [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li.task]:-ml-5 [&_li.task]:list-none [&_li.done>span]:line-through [&_li.done>span]:opacity-60 [&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-80 [&_code]:rounded [&_code]:bg-foreground/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-foreground/10 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-primary [&_a]:underline [&_hr]:my-3 [&_mark]:rounded-sm [&_mark]:bg-yellow-300/70 [&_input]:mr-1 [&_input]:size-3.5 [&_input]:cursor-pointer [&_input]:align-middle [&_input]:accent-primary'

interface NoteEditorProps {
  note: Note
  prefs: NotesPrefs
  onBodyChange: (body: string) => void
  onPrefsChange: (patch: Partial<NotesPrefs>) => void
  onZoom: (change: number | 'reset') => void
  onSave: () => void
  onPrint: () => void
  autoFocus: boolean
  savedLabel: string
  readOnly?: boolean
}

interface ToolButtonProps {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  children: ReactNode
}

function ToolButton({ label, shortcut, onClick, disabled, pressed, children }: ToolButtonProps) {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant={pressed ? 'secondary' : 'ghost'}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={shortcut ? `${label} (${shortcut})` : label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
}

function nowStamp(): string {
  const d = new Date()
  return `${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} ${d.toLocaleDateString()}`
}

export function NoteEditor({
  note,
  prefs,
  onBodyChange,
  onPrefsChange,
  onZoom,
  onSave,
  onPrint,
  autoFocus,
  savedLabel,
  readOnly = false,
}: NoteEditorProps) {
  const { t } = useTranslation()
  const body = note.body
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const [preview, setPreview] = useState(false)
  const [find, setFind] = useState<{ mode: FindMode; token: number } | null>(null)
  const [query, setQuery] = useState('')
  const [findOptions, setFindOptions] = useState<FindOptions>({ matchCase: false, wholeWord: false })
  const [matchIndex, setMatchIndex] = useState(0)

  const searching = find !== null && find.mode !== 'goto'
  const matches = useMemo(
    () => (searching ? findMatches(body, query, findOptions) : []),
    [searching, body, query, findOptions],
  )
  const current = matches.length ? Math.min(matchIndex, matches.length - 1) : -1
  const stats = useMemo(() => textStats(body), [body])
  const position = caretPosition(body, Math.min(selection.end, body.length))
  const selectedChars = Math.abs(selection.end - selection.start)
  const previewHtml = useMemo(() => (preview ? markdownToHtml(body, { interactive: true }) : ''), [preview, body])
  const colors = NOTE_COLOR_STYLES[note.color]
  const textStyle = { fontSize: `${(14 * prefs.zoom) / 100}px` }
  const wrapStyle = prefs.wordWrap
    ? { whiteSpace: 'pre-wrap' as const, overflowWrap: 'break-word' as const }
    : { whiteSpace: 'pre' as const, overflowWrap: 'normal' as const }

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      onZoom(event.deltaY < 0 ? 10 : -10)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom])

  const syncScroll = () => {
    const el = textareaRef.current
    const backdrop = backdropRef.current
    if (!el || !backdrop) return
    backdrop.scrollTop = el.scrollTop
    backdrop.scrollLeft = el.scrollLeft
  }

  useEffect(() => {
    const el = textareaRef.current
    const mark = backdropRef.current?.querySelector<HTMLElement>('mark[data-current]')
    if (!el || !mark) return
    if (mark.offsetTop < el.scrollTop || mark.offsetTop > el.scrollTop + el.clientHeight - 32) {
      el.scrollTop = Math.max(0, mark.offsetTop - el.clientHeight / 3)
    }
    if (mark.offsetLeft < el.scrollLeft || mark.offsetLeft > el.scrollLeft + el.clientWidth - 32) {
      el.scrollLeft = Math.max(0, mark.offsetLeft - el.clientWidth / 3)
    }
    syncScroll()
  }, [current, matches])

  const readSelection = () => {
    const el = textareaRef.current
    if (!el) return
    setSelection({ start: el.selectionStart, end: el.selectionEnd })
  }

  /** Applies an edit through the browser's editing pipeline so Ctrl+Z / Ctrl+Y keep working. */
  const runEdit = (edit: TextEdit) => {
    const el = textareaRef.current
    if (!el || readOnly) return
    if (edit.from === edit.to && edit.insert === '') return
    el.focus()
    el.setSelectionRange(edit.from, edit.to)
    let applied: boolean
    try {
      applied =
        typeof document.execCommand === 'function' &&
        (edit.insert === '' ? document.execCommand('delete') : document.execCommand('insertText', false, edit.insert))
    } catch {
      applied = false
    }
    if (!applied) onBodyChange(applyEdit(el.value, edit))
    const select = () => {
      el.setSelectionRange(edit.selStart, edit.selEnd)
      setSelection({ start: edit.selStart, end: edit.selEnd })
    }
    select()
    if (!applied) requestAnimationFrame(select)
  }

  const currentRange = () => {
    const el = textareaRef.current
    return el ? { start: el.selectionStart, end: el.selectionEnd, text: el.value } : null
  }

  const wrap = (before: string, after = before) => {
    const r = currentRange()
    if (r) runEdit(wrapSelection(r.text, r.start, r.end, before, after))
  }

  const linePrefix = (kind: LineKind) => {
    const r = currentRange()
    if (r) runEdit(toggleLinePrefix(r.text, r.start, r.end, kind))
  }

  const insertCode = () => {
    const r = currentRange()
    if (!r) return
    if (r.text.slice(r.start, r.end).includes('\n')) runEdit(wrapSelection(r.text, r.start, r.end, '```\n', '\n```'))
    else runEdit(wrapSelection(r.text, r.start, r.end, '`'))
  }

  const insertLink = () => {
    const r = currentRange()
    if (!r) return
    const selected = r.text.slice(r.start, r.end)
    if (/^(https?:\/\/|mailto:)\S+$/i.test(selected)) {
      runEdit({ from: r.start, to: r.end, insert: `[](${selected})`, selStart: r.start + 1, selEnd: r.start + 1 })
      return
    }
    const label = selected || t('notes.linkText')
    const urlStart = r.start + label.length + 3
    runEdit({
      from: r.start,
      to: r.end,
      insert: `[${label}](https://)`,
      selStart: urlStart,
      selEnd: urlStart + 8,
    })
  }

  const insertText = (text: string) => {
    const r = currentRange()
    if (!r) return
    const caret = r.start + text.length
    runEdit({ from: r.start, to: r.end, insert: text, selStart: caret, selEnd: caret })
  }

  const history = (command: 'undo' | 'redo') => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    try {
      document.execCommand(command)
    } catch {
      // execCommand is unavailable outside real browsers.
    }
    readSelection()
  }

  const openFind = (mode: FindMode) => {
    setPreview(false)
    const el = textareaRef.current
    if (mode !== 'goto' && el && el.selectionEnd > el.selectionStart) {
      const selected = el.value.slice(el.selectionStart, el.selectionEnd)
      if (!selected.includes('\n')) setQuery(selected)
    }
    setFind((prev) => ({ mode, token: (prev?.token ?? 0) + 1 }))
  }

  const closeFind = () => {
    setFind(null)
    textareaRef.current?.focus()
  }

  const selectMatch = (index: number, list = matches) => {
    const m = list[index]
    const el = textareaRef.current
    if (!m || !el) return
    setMatchIndex(index)
    el.setSelectionRange(m.start, m.end)
    setSelection({ start: m.start, end: m.end })
  }

  const step = (dir: 1 | -1) => {
    if (!matches.length) return
    selectMatch((current + dir + matches.length) % matches.length)
  }

  const onQueryChange = (value: string) => {
    setQuery(value)
    const list = findMatches(body, value, findOptions)
    const from = Math.min(selection.start, selection.end)
    const index = Math.max(0, list.findIndex((m) => m.start >= from))
    if (list.length) selectMatch(index, list)
    else setMatchIndex(0)
  }

  const replaceCurrent = (replacement: string) => {
    const m = matches[current]
    if (!m) return
    const caret = m.start + replacement.length
    runEdit({ from: m.start, to: m.end, insert: replacement, selStart: caret, selEnd: caret })
    const next = findMatches(applyEdit(body, { from: m.start, to: m.end, insert: replacement, selStart: 0, selEnd: 0 }), query, findOptions)
    const index = next.findIndex((x) => x.start >= caret)
    setMatchIndex(index === -1 ? 0 : index)
  }

  const replaceEverything = (replacement: string) => {
    const result = replaceAll(body, query, replacement, findOptions)
    if (!result.count) return
    runEdit({ from: 0, to: body.length, insert: result.text, selStart: 0, selEnd: 0 })
    setMatchIndex(0)
  }

  const goToLine = (line: number) => {
    const offset = lineOffset(body, line)
    const el = textareaRef.current
    setFind(null)
    if (!el) return
    el.focus()
    el.setSelectionRange(offset, offset)
    setSelection({ start: offset, end: offset })
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 22
    if (!prefs.wordWrap) el.scrollTop = Math.max(0, (line - 3) * lineHeight)
    else {
      // With wrapping, the caret position is the only reliable anchor; blur/focus scrolls it into view.
      el.blur()
      el.focus()
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    const handle = (fn: () => void) => {
      event.preventDefault()
      fn()
    }
    if (mod && !event.altKey) {
      if (event.shiftKey) {
        if (key === 'x') return handle(() => wrap('~~'))
        if (event.code === 'Digit7') return handle(() => linePrefix('ordered'))
        if (event.code === 'Digit8') return handle(() => linePrefix('bullet'))
        if (event.code === 'Digit9') return handle(() => linePrefix('check'))
        if (key === '.' || key === '>') return handle(() => linePrefix('quote'))
        if (key === 'h') return handle(() => onPrefsChange({ wordWrap: !prefs.wordWrap }))
        return
      }
      if (key === 'b') return handle(() => wrap('**'))
      if (key === 'i') return handle(() => wrap('*'))
      if (key === 'u') return handle(() => wrap('<u>', '</u>'))
      if (key === 'k') return handle(insertLink)
      if (key === 'e') return handle(insertCode)
      if (key === 'f') return handle(() => openFind('find'))
      if (key === 'h') return handle(() => openFind('replace'))
      if (key === 'g') return handle(() => openFind('goto'))
      if (key === 's') return handle(onSave)
      if (key === 'p') return handle(onPrint)
      if (key === '=' || key === '+') return handle(() => onZoom(10))
      if (key === '-') return handle(() => onZoom(-10))
      if (key === '0') return handle(() => onZoom('reset'))
      if (key === 'y') return handle(() => history('redo'))
      return
    }
    if (event.key === 'F5') return handle(() => insertText(nowStamp()))
    if (event.key === 'F3' && searching) return handle(() => step(event.shiftKey ? -1 : 1))
    if (event.key === 'Escape' && find) return handle(closeFind)
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      const el = event.currentTarget
      if (el.selectionStart !== el.selectionEnd) return
      const edit = continueList(el.value, el.selectionStart)
      if (edit) handle(() => runEdit(edit))
    }
  }

  const highlighted = useMemo(() => {
    if (!matches.length) return null
    const parts: ReactNode[] = []
    let last = 0
    matches.slice(0, MAX_HIGHLIGHTS).forEach((m, i) => {
      parts.push(body.slice(last, m.start))
      parts.push(
        <mark
          key={m.start}
          data-current={i === current || undefined}
          className={cn('rounded-[2px] text-transparent', i === current ? 'bg-orange-400/70' : 'bg-yellow-300/60')}
        >
          {body.slice(m.start, m.end)}
        </mark>,
      )
      last = m.end
    })
    parts.push(`${body.slice(last)}\n `)
    return parts
  }, [matches, current, body])

  const fmtDisabled = preview || readOnly

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div
        role="toolbar"
        aria-label={t('notes.formatting')}
        className="scrollbar-none flex items-center gap-0.5 overflow-x-auto rounded-lg border bg-muted/30 p-0.5"
      >
        <ToolButton label={t('notes.undo')} shortcut="Ctrl+Z" onClick={() => history('undo')} disabled={fmtDisabled}>
          <Undo2Icon />
        </ToolButton>
        <ToolButton label={t('notes.redo')} shortcut="Ctrl+Y" onClick={() => history('redo')} disabled={fmtDisabled}>
          <Redo2Icon />
        </ToolButton>
        <Divider />
        <ToolButton label={t('notes.bold')} shortcut="Ctrl+B" onClick={() => wrap('**')} disabled={fmtDisabled}>
          <BoldIcon />
        </ToolButton>
        <ToolButton label={t('notes.italic')} shortcut="Ctrl+I" onClick={() => wrap('*')} disabled={fmtDisabled}>
          <ItalicIcon />
        </ToolButton>
        <ToolButton
          label={t('notes.underline')}
          shortcut="Ctrl+U"
          onClick={() => wrap('<u>', '</u>')}
          disabled={fmtDisabled}
        >
          <UnderlineIcon />
        </ToolButton>
        <ToolButton
          label={t('notes.strikethrough')}
          shortcut="Ctrl+Shift+X"
          onClick={() => wrap('~~')}
          disabled={fmtDisabled}
        >
          <StrikethroughIcon />
        </ToolButton>
        <Divider />
        <ToolButton label={t('notes.heading')} onClick={() => linePrefix('heading')} disabled={fmtDisabled}>
          <Heading2Icon />
        </ToolButton>
        <ToolButton
          label={t('notes.bulletList')}
          shortcut="Ctrl+Shift+8"
          onClick={() => linePrefix('bullet')}
          disabled={fmtDisabled}
        >
          <ListIcon />
        </ToolButton>
        <ToolButton
          label={t('notes.numberedList')}
          shortcut="Ctrl+Shift+7"
          onClick={() => linePrefix('ordered')}
          disabled={fmtDisabled}
        >
          <ListOrderedIcon />
        </ToolButton>
        <ToolButton
          label={t('notes.checklist')}
          shortcut="Ctrl+Shift+9"
          onClick={() => linePrefix('check')}
          disabled={fmtDisabled}
        >
          <ListChecksIcon />
        </ToolButton>
        <ToolButton label={t('notes.quote')} onClick={() => linePrefix('quote')} disabled={fmtDisabled}>
          <QuoteIcon />
        </ToolButton>
        <ToolButton label={t('notes.code')} shortcut="Ctrl+E" onClick={insertCode} disabled={fmtDisabled}>
          <CodeIcon />
        </ToolButton>
        <ToolButton label={t('notes.link')} shortcut="Ctrl+K" onClick={insertLink} disabled={fmtDisabled}>
          <LinkIcon />
        </ToolButton>
        <Divider />
        <ToolButton
          label={t('notes.insertDateTime')}
          shortcut="F5"
          onClick={() => insertText(nowStamp())}
          disabled={fmtDisabled}
        >
          <CalendarClockIcon />
        </ToolButton>
        <ToolButton label={t('notes.findReplace')} shortcut="Ctrl+F" onClick={() => openFind('find')}>
          <SearchIcon />
        </ToolButton>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
          <ToolButton
            label={preview ? t('notes.edit') : t('notes.preview')}
            onClick={() => {
              setPreview((p) => !p)
              setFind(null)
            }}
            pressed={preview}
          >
            {preview ? <PencilIcon /> : <EyeIcon />}
          </ToolButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-xs" variant="ghost" aria-label={t('notes.view')} title={t('notes.view')}>
                <SlidersHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))]">
              <DropdownMenuLabel>{t('notes.zoom', { value: prefs.zoom })}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault()
                  onZoom(10)
                }}>
                {t('notes.zoomIn')}
                <span className="ml-auto text-xs text-muted-foreground">Ctrl++</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault()
                  onZoom(-10)
                }}>
                {t('notes.zoomOut')}
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+-</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onZoom('reset')}>
                {t('notes.zoomReset')}
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+0</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={prefs.wordWrap}
                onCheckedChange={(v) => onPrefsChange({ wordWrap: v === true })}
              >
                {t('notes.wordWrap')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={prefs.spellcheck}
                onCheckedChange={(v) => onPrefsChange({ spellcheck: v === true })}
              >
                {t('notes.spellcheck')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={prefs.statusBar}
                onCheckedChange={(v) => onPrefsChange({ statusBar: v === true })}
              >
                {t('notes.statusBar')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('notes.font')}</DropdownMenuLabel>
              {(['sans', 'serif', 'mono'] as const).map((font) => (
                <DropdownMenuCheckboxItem
                  key={font}
                  checked={prefs.font === font}
                  onCheckedChange={() => onPrefsChange({ font })}
                  className={FONT_CLASS[font]}
                >
                  {t(`notes.font.${font}`)}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openFind('replace')}>
                {t('notes.replace')}
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+H</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openFind('goto')}>
                {t('notes.goToLine')}
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+G</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {find && (
        <FindBar
          mode={find.mode}
          onModeChange={(mode) => setFind((prev) => ({ mode, token: prev?.token ?? 0 }))}
          query={query}
          onQueryChange={onQueryChange}
          options={findOptions}
          onOptionsChange={setFindOptions}
          matchCount={matches.length}
          currentIndex={Math.max(0, current)}
          onNext={() => step(1)}
          onPrevious={() => step(-1)}
          onReplace={replaceCurrent}
          onReplaceAll={replaceEverything}
          onGoToLine={goToLine}
          lineCount={stats.lines}
          onClose={closeFind}
          focusToken={find.token}
        />
      )}

      <div
        ref={surfaceRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden rounded-lg border shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
          colors.surface,
          FONT_CLASS[prefs.font],
        )}
      >
        {preview ? (
          <div
            className={cn(SURFACE, 'scrollbar-styled overflow-auto', PROSE)}
            style={{ ...textStyle, whiteSpace: 'normal' }}
            role="document"
            aria-label={t('notes.preview')}
            tabIndex={0}
            onClick={(e) => {
              const target = e.target as HTMLElement
              if (readOnly && target instanceof HTMLInputElement) {
                e.preventDefault()
                return
              }
              if (target instanceof HTMLInputElement && target.dataset.line) {
                onBodyChange(toggleCheckboxAtLine(body, Number(target.dataset.line)))
              }
            }}
            onDoubleClick={(e) => {
              if (!(e.target instanceof HTMLInputElement)) setPreview(false)
            }}
          >
            {body.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="text-muted-foreground">{t('notes.previewEmpty')}</p>
            )}
          </div>
        ) : (
          <>
            {highlighted && (
              <div
                ref={backdropRef}
                aria-hidden
                className={cn(SURFACE, 'pointer-events-none absolute inset-0 overflow-scroll text-transparent')}
                style={{ ...textStyle, ...wrapStyle, scrollbarColor: 'transparent transparent' }}
              >
                {highlighted}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                onBodyChange(e.target.value)
                setSelection({ start: e.target.selectionStart, end: e.target.selectionEnd })
              }}
              onSelect={readSelection}
              onKeyDown={onKeyDown}
              onScroll={syncScroll}
              readOnly={readOnly}
              placeholder={t('notes.body')}
              aria-label={t('notes.body')}
              spellCheck={prefs.spellcheck}
              wrap={prefs.wordWrap ? 'soft' : 'off'}
              className={cn(
                SURFACE,
                'scrollbar-styled relative resize-none overflow-x-auto bg-transparent outline-none placeholder:text-muted-foreground/70',
              )}
              style={{ ...textStyle, ...wrapStyle }}
            />
          </>
        )}
      </div>

      {prefs.statusBar && (
        <div
          className="flex items-center gap-2 overflow-hidden px-1 text-[10.5px] whitespace-nowrap text-muted-foreground tabular-nums"
          aria-live="off"
        >
          <span>{t('notes.position', { line: position.line, column: position.column })}</span>
          <span aria-hidden>·</span>
          <span>{t('notes.words', { count: stats.words })}</span>
          <span aria-hidden>·</span>
          <span>
            {selectedChars
              ? t('notes.selectedChars', { selected: selectedChars, count: stats.characters })
              : t('notes.characters', { count: stats.characters })}
          </span>
          <span aria-hidden>·</span>
          <button
            type="button"
            className="cursor-pointer hover:text-foreground"
            onClick={() => onZoom('reset')}
            title={t('notes.zoomReset')}
          >
            {prefs.zoom}%
          </button>
          <span className="ml-auto truncate">{savedLabel}</span>
        </div>
      )}
    </div>
  )
}
