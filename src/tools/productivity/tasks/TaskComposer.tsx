import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import {
  AtSignIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CornerDownLeftIcon,
  FlagIcon,
  FolderPlusIcon,
  InboxIcon,
  Link2Icon,
  ListPlusIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react'

import type { ActivePage } from '@/core/tasks/activePage'
import {
  INBOX_ID,
  TASK_PRIORITIES,
  linkHost,
  normalizeLabel,
  type ReminderOffset,
  type TaskLink,
  type TaskPriority,
  type TaskProject,
  type TaskRecurrence,
} from '@/core/tasks/model'
import { parseQuickAdd, type ParsedKind, type ParsedTask, type ParsedToken } from '@/core/tasks/parse'
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
import { Popover, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

import { AnimatedPopoverContent } from './AnimatedPopover'
import { DuePicker, type DueValue } from './DuePicker'
import { useDayWords } from './labels'
import { dueTone, findProject, formatDue, isInboxName, removeTokens } from './logic'
import { Favicon, ProjectDot } from './TaskMeta'
import { DUE_TONE_STYLES, LABEL_TEXT, PRIORITY_STYLES, TOKEN_STYLES } from './taskStyles'

export interface ComposerDefaults {
  due: number | null
  allDay: boolean
  projectId: string
  labels: string[]
}

export interface ComposerDraft {
  title: string
  notes: string
  due: number | null
  allDay: boolean
  recurrence: TaskRecurrence
  reminder: ReminderOffset | null | undefined
  priority: TaskPriority
  projectId: string
  /** Set when "#Name" names a project that does not exist yet. */
  newProjectName: string | null
  labels: string[]
  link: TaskLink | null
}

export interface TaskComposerHandle {
  focus: () => void
  prefill: (draft: { title: string; link: TaskLink | null }) => void
}

interface TaskComposerProps {
  ref?: Ref<TaskComposerHandle>
  projects: TaskProject[]
  knownLabels: string[]
  defaults: ComposerDefaults
  now: number
  load: Map<string, number>
  activePage: ActivePage | null
  onSubmit: (drafts: ComposerDraft[]) => void
}

const EMPTY_DUE: DueValue = { due: null, allDay: true, recurrence: 'none', reminder: null }

interface ParseResult {
  parsed: ParsedTask
  /** Token positions in the full text, including the protected prefix. */
  tokens: ParsedToken[]
  title: string
}

/** Text captured from a page is kept literal; only what the user types after it is parsed. */
function parseWithPrefix(text: string, prefix: string, now: number, ignore: ParsedKind[]): ParseResult {
  const protectedPart = prefix && text.startsWith(prefix) ? prefix : ''
  const parsed = parseQuickAdd(text.slice(protectedPart.length), { now, ignore })
  const offset = protectedPart.length
  const tokens = parsed.tokens.map((token) => ({ ...token, start: token.start + offset, end: token.end + offset }))
  const title = `${protectedPart.trim()} ${parsed.title}`.trim()
  return { parsed, tokens, title }
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of labels) {
    const label = normalizeLabel(raw)
    if (!label || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    result.push(label)
  }
  return result
}

function HighlightedText({ text, tokens }: { text: string; tokens: ParsedToken[] }) {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const token of tokens) {
    if (token.start < cursor) continue
    parts.push(text.slice(cursor, token.start))
    parts.push(
      <mark key={token.start} className={cn('rounded-[3px] text-foreground ring-1 ring-inset', TOKEN_STYLES[token.kind])}>
        {text.slice(token.start, token.end)}
      </mark>,
    )
    cursor = token.end
  }
  parts.push(text.slice(cursor))
  return <>{parts}</>
}

function Chip({
  icon,
  children,
  className,
  onRemove,
  removeLabel,
}: {
  icon?: ReactNode
  children: ReactNode
  className?: string
  onRemove?: () => void
  removeLabel?: string
}) {
  return (
    <motion.span
      layout="position"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      className={cn(
        'inline-flex h-6 max-w-full min-w-0 items-center gap-1 rounded-full border bg-background pr-1 pl-2 text-[11px] font-medium shadow-xs',
        !onRemove && 'pr-2',
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </motion.span>
  )
}

export function TaskComposer({
  ref,
  projects,
  knownLabels,
  defaults,
  now,
  load,
  activePage,
  onSubmit,
}: TaskComposerProps) {
  const { t } = useTranslation()
  const words = useDayWords()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [prefix, setPrefix] = useState('')
  const [ignore, setIgnore] = useState<ParsedKind[]>([])
  const [manualDue, setManualDue] = useState<DueValue | null | undefined>(undefined)
  const [manualPriority, setManualPriority] = useState<TaskPriority | undefined>(undefined)
  const [manualProject, setManualProject] = useState<string | undefined>(undefined)
  const [manualLabels, setManualLabels] = useState<string[]>([])
  const [link, setLink] = useState<TaskLink | null>(null)
  const [pasteLines, setPasteLines] = useState<string[] | null>(null)
  const [dueOpen, setDueOpen] = useState(false)
  const [focusTick, setFocusTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasDraft = useRef(false)

  const { parsed, tokens, title } = useMemo(
    () => parseWithPrefix(text, prefix, now, ignore),
    [text, prefix, now, ignore],
  )

  const resolveDue = (result: ParsedTask): DueValue => {
    if (result.due != null) {
      return {
        due: result.due,
        allDay: result.allDay,
        recurrence: result.recurrence ?? manualDue?.recurrence ?? 'none',
        reminder: manualDue?.reminder ?? (result.allDay ? null : 0),
      }
    }
    if (manualDue !== undefined) return manualDue ?? EMPTY_DUE
    return { due: defaults.due, allDay: defaults.allDay, recurrence: 'none', reminder: defaults.allDay ? null : 0 }
  }

  const resolveProject = (result: ParsedTask): { projectId: string; newProjectName: string | null } => {
    if (result.project) {
      if (isInboxName(result.project)) return { projectId: INBOX_ID, newProjectName: null }
      const found = findProject(result.project, projects)
      if (found) return { projectId: found.id, newProjectName: null }
      return { projectId: INBOX_ID, newProjectName: result.project }
    }
    return { projectId: manualProject ?? defaults.projectId, newProjectName: null }
  }

  const buildDraft = (result: ParsedTask, draftTitle: string, withExtras: boolean): ComposerDraft => {
    const due = resolveDue(result)
    return {
      title: draftTitle,
      notes: withExtras ? notes.trim() : '',
      due: due.due,
      allDay: due.allDay,
      recurrence: due.due == null ? 'none' : due.recurrence,
      reminder: due.due == null ? null : due.reminder,
      priority: result.priority ?? manualPriority ?? 4,
      ...resolveProject(result),
      labels: uniqueLabels([...defaults.labels, ...manualLabels, ...result.labels]),
      link: withExtras ? link : null,
    }
  }

  const due = resolveDue(parsed)
  const project = resolveProject(parsed)
  const priority = parsed.priority ?? manualPriority ?? 4
  const labels = uniqueLabels([...defaults.labels, ...manualLabels, ...parsed.labels])
  const currentProject = projects.find((p) => p.id === project.projectId) ?? null
  const dateFromText = parsed.due != null
  const canSubmit = title.length > 0

  useEffect(() => {
    hasDraft.current = text.trim().length > 0 || notes.trim().length > 0
  }, [text, notes])

  useEffect(() => {
    if (!open || focusTick === 0) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [open, focusTick])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (rootRef.current?.contains(target)) return
      if (target.closest('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"], [role="listbox"]')) return
      if (!hasDraft.current) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const reset = () => {
    setText('')
    setNotes('')
    setPrefix('')
    setIgnore([])
    setManualDue(undefined)
    setManualPriority(undefined)
    setManualProject(undefined)
    setManualLabels([])
    setLink(null)
    setPasteLines(null)
  }

  const expand = () => {
    setOpen(true)
    setFocusTick((n) => n + 1)
  }

  useImperativeHandle(ref, () => ({
    focus: expand,
    prefill: (draft) => {
      setText(draft.title)
      setPrefix(draft.title)
      setIgnore([])
      setLink(draft.link)
      setPasteLines(null)
      expand()
    },
  }))

  const submit = () => {
    if (!canSubmit) return
    onSubmit([buildDraft(parsed, title, true)])
    reset()
    setFocusTick((n) => n + 1)
  }

  const submitLines = (lines: string[]) => {
    const drafts = lines
      .map((line) => {
        const result = parseQuickAdd(line, { now, ignore })
        return result.title ? buildDraft(result, result.title, false) : null
      })
      .filter((draft): draft is ComposerDraft => draft != null)
    if (drafts.length) onSubmit(drafts)
    reset()
    setFocusTick((n) => n + 1)
  }

  const stripKind = (kind: ParsedKind) => setText((current) => removeTokens(current, tokens, [kind]))

  const keepAsText = (kind: ParsedKind) => setIgnore((current) => (current.includes(kind) ? current : [...current, kind]))

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData('text')
    const lines = pasted
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/, '').trim())
      .filter(Boolean)
    if (lines.length < 2 || text.trim()) return
    event.preventDefault()
    setPasteLines(lines.slice(0, 100))
  }

  const pageAlreadyLinked = link != null && activePage != null && link.url === activePage.url

  if (!open) {
    return (
      <motion.button
        type="button"
        layout
        onClick={expand}
        className="group flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-left text-[13.5px] text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex size-6 items-center justify-center rounded-full text-primary transition-[background-color,color,transform] duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
          <PlusIcon className="size-4" aria-hidden />
        </span>
        <span className="flex-1">{t('tasks.composer.add')}</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-sans text-[10.5px] leading-5 text-muted-foreground @[360px]:inline">
          Q
        </kbd>
      </motion.button>
    )
  }

  return (
    <motion.div
      ref={rootRef}
      layout
      initial={{ opacity: 0, y: -6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 38 }}
      className="rounded-xl border bg-card shadow-sm ring-primary/15 transition-[box-shadow,border-color] focus-within:border-primary/40 focus-within:shadow-md focus-within:ring-4"
    >
      <AnimatePresence initial={false} mode="wait">
        {pasteLines ? (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex flex-col gap-2 p-3"
          >
            <p className="flex items-center gap-2 text-[13px] font-medium">
              <ListPlusIcon className="size-4 text-primary" aria-hidden />
              {t('tasks.composer.pasteTitle', { count: pasteLines.length })}
            </p>
            <ul className="scrollbar-styled max-h-28 space-y-0.5 overflow-y-auto rounded-md bg-muted/50 p-2 text-[12px] text-muted-foreground">
              {pasteLines.slice(0, 8).map((line, index) => (
                <li key={index} className="truncate">
                  {line}
                </li>
              ))}
              {pasteLines.length > 8 && <li>{t('tasks.composer.pasteMore', { count: pasteLines.length - 8 })}</li>}
            </ul>
            <div className="flex justify-end gap-1.5">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setText(pasteLines.join(' '))
                  setPasteLines(null)
                  setFocusTick((n) => n + 1)
                }}
              >
                {t('tasks.composer.pasteAsOne')}
              </Button>
              <Button size="xs" onClick={() => submitLines(pasteLines)}>
                {t('tasks.composer.pasteAdd', { count: pasteLines.length })}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={false} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
            <div className="relative px-3 pt-2.5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-3 top-2.5 text-[14px] leading-6 font-medium break-words whitespace-pre-wrap text-foreground"
              >
                <HighlightedText text={text} tokens={tokens} />
              </div>
              <textarea
                ref={inputRef}
                value={text}
                rows={1}
                onChange={(event) => setText(event.target.value.replace(/\r?\n/g, ' '))}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                placeholder={t('tasks.composer.placeholder')}
                aria-label={t('tasks.composer.label')}
                aria-describedby="tasks-composer-hint"
                maxLength={500}
                spellCheck
                className="relative block min-h-6 w-full resize-none bg-transparent p-0 text-[14px] leading-6 font-medium break-words text-transparent caret-foreground outline-none [field-sizing:content] placeholder:font-normal placeholder:text-muted-foreground/80 selection:bg-primary/25"
              />
              <textarea
                value={notes}
                rows={1}
                onChange={(event) => setNotes(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    submit()
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    setOpen(false)
                  }
                }}
                placeholder={t('tasks.composer.notes')}
                aria-label={t('tasks.composer.notes')}
                maxLength={20000}
                className="mt-0.5 block max-h-32 min-h-5 w-full resize-none bg-transparent p-0 text-[12.5px] leading-5 text-muted-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground/60"
              />
              <p id="tasks-composer-hint" className="sr-only">
                {t('tasks.composer.hint')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 px-3 pt-2">
              <AnimatePresence initial={false} mode="popLayout">
                {due.due != null && (
                  <Chip
                    key="due"
                    icon={<CalendarIcon className="size-3 shrink-0" aria-hidden />}
                    className={cn(DUE_TONE_STYLES[dueTone(due.due, due.allDay, now)], dateFromText && 'border-emerald-500/30 bg-emerald-500/10')}
                    onRemove={() => (dateFromText ? keepAsText('date') : setManualDue(null))}
                    removeLabel={dateFromText ? t('tasks.composer.keepText') : t('tasks.composer.clearDate')}
                  >
                    {formatDue(due.due, due.allDay, now, words)}
                    {due.recurrence !== 'none' && ` · ${t(`tasks.repeat.${due.recurrence}`)}`}
                  </Chip>
                )}
                {priority < 4 && (
                  <Chip
                    key="priority"
                    icon={<FlagIcon className="size-3 shrink-0" fill="currentColor" aria-hidden />}
                    className={PRIORITY_STYLES[priority].text}
                    onRemove={() => (parsed.priority != null ? keepAsText('priority') : setManualPriority(undefined))}
                    removeLabel={parsed.priority != null ? t('tasks.composer.keepText') : t('tasks.composer.clearPriority')}
                  >
                    {t(`tasks.priority.p${priority}`)}
                  </Chip>
                )}
                {project.newProjectName && (
                  <Chip
                    key="new-project"
                    icon={<FolderPlusIcon className="size-3 shrink-0" aria-hidden />}
                    className="text-primary"
                    onRemove={() => keepAsText('project')}
                    removeLabel={t('tasks.composer.keepText')}
                  >
                    {t('tasks.composer.newProject', { name: project.newProjectName })}
                  </Chip>
                )}
                {labels.map((label) => {
                  const fromText = parsed.labels.some((l) => l.toLowerCase() === label.toLowerCase())
                  const fromManual = manualLabels.some((l) => l.toLowerCase() === label.toLowerCase())
                  return (
                    <Chip
                      key={`label-${label.toLowerCase()}`}
                      icon={<AtSignIcon className="size-3 shrink-0" aria-hidden />}
                      className={LABEL_TEXT}
                      onRemove={
                        fromText
                          ? () => keepAsText('label')
                          : fromManual
                            ? () => setManualLabels((current) => current.filter((l) => l.toLowerCase() !== label.toLowerCase()))
                            : undefined
                      }
                      removeLabel={fromText ? t('tasks.composer.keepText') : t('tasks.composer.removeLabel')}
                    >
                      {label}
                    </Chip>
                  )
                })}
                {link && (
                  <Chip
                    key="link"
                    icon={<Favicon src={link.favIconUrl} className="size-3" />}
                    className="max-w-[14rem] text-muted-foreground"
                    onRemove={() => setLink(null)}
                    removeLabel={t('tasks.composer.removeLink')}
                  >
                    {link.title || linkHost(link.url)}
                  </Chip>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-2 flex items-center gap-0.5 border-t px-2 py-1.5">
              <Popover open={dueOpen} onOpenChange={setDueOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className={cn('text-muted-foreground', due.due != null && 'text-primary')}
                    aria-label={t('tasks.composer.date')}
                    title={t('tasks.composer.date')}
                  >
                    <CalendarIcon />
                  </Button>
                </PopoverTrigger>
                <AnimatedPopoverContent align="start" className="w-72 p-2.5">
                  <DuePicker
                    value={due}
                    now={now}
                    load={load}
                    onChange={(value) => {
                      if (dateFromText) stripKind('date')
                      setManualDue(value.due == null ? null : value)
                    }}
                    onDone={() => {
                      setDueOpen(false)
                      setFocusTick((n) => n + 1)
                    }}
                  />
                </AnimatedPopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className={cn('text-muted-foreground', priority < 4 && PRIORITY_STYLES[priority].text)}
                    aria-label={t('tasks.priority.label')}
                    title={t('tasks.priority.label')}
                  >
                    <FlagIcon fill={priority < 4 ? 'currentColor' : 'none'} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {TASK_PRIORITIES.map((value) => (
                    <DropdownMenuItem
                      key={value}
                      onSelect={() => {
                        if (parsed.priority != null) stripKind('priority')
                        setManualPriority(value)
                      }}
                    >
                      <FlagIcon
                        className={cn('size-4', PRIORITY_STYLES[value].text)}
                        fill={value < 4 ? 'currentColor' : 'none'}
                      />
                      {t(`tasks.priority.p${value}`)}
                      {priority === value && <CheckIcon className="ml-auto size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className={cn('text-muted-foreground', labels.length > 0 && LABEL_TEXT)}
                    aria-label={t('tasks.composer.labels')}
                    title={t('tasks.composer.labels')}
                  >
                    <AtSignIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 w-52">
                  <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                    {t('tasks.composer.labelsHint')}
                  </DropdownMenuLabel>
                  {knownLabels.length > 0 && <DropdownMenuSeparator />}
                  {knownLabels.map((label) => {
                    const checked = labels.some((l) => l.toLowerCase() === label.toLowerCase())
                    return (
                      <DropdownMenuCheckboxItem
                        key={label}
                        checked={checked}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(value) =>
                          setManualLabels((current) =>
                            value
                              ? [...current, label]
                              : current.filter((l) => l.toLowerCase() !== label.toLowerCase()),
                          )
                        }
                      >
                        <span className={LABEL_TEXT}>@{label}</span>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {activePage && !pageAlreadyLinked && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() =>
                    setLink({
                      url: activePage.url,
                      title: activePage.title,
                      ...(activePage.favIconUrl ? { favIconUrl: activePage.favIconUrl } : {}),
                    })
                  }
                  aria-label={t('tasks.composer.attachPage')}
                  title={t('tasks.composer.attachPage')}
                >
                  <Link2Icon />
                </Button>
              )}

              <div className="ml-auto flex min-w-0 items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="max-w-[9rem] min-w-0 gap-1.5 px-2 text-muted-foreground"
                      aria-label={t('tasks.composer.project')}
                      title={t('tasks.composer.project')}
                    >
                      {currentProject ? (
                        <ProjectDot color={currentProject.color} />
                      ) : (
                        <InboxIcon className="text-primary" />
                      )}
                      <span className="truncate">{currentProject?.name ?? t('tasks.inbox')}</span>
                      <ChevronDownIcon className="opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-72 w-48">
                    <DropdownMenuItem
                      onSelect={() => {
                        if (parsed.project) stripKind('project')
                        setManualProject(INBOX_ID)
                      }}
                    >
                      <InboxIcon className="size-4 text-primary" />
                      {t('tasks.inbox')}
                      {project.projectId === INBOX_ID && !project.newProjectName && (
                        <CheckIcon className="ml-auto size-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                    {projects.length > 0 && <DropdownMenuSeparator />}
                    {projects.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onSelect={() => {
                          if (parsed.project) stripKind('project')
                          setManualProject(item.id)
                        }}
                      >
                        <ProjectDot color={item.color} className="mx-1" />
                        <span className="truncate">{item.name}</span>
                        {project.projectId === item.id && <CheckIcon className="ml-auto size-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    reset()
                    setOpen(false)
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button size="xs" onClick={submit} disabled={!canSubmit} className="gap-1">
                  {t('tasks.composer.submit')}
                  <CornerDownLeftIcon className="opacity-70" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
