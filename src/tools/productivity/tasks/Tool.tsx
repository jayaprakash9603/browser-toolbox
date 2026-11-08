import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import {
  ArrowDownUpIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  ListTodoIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react'

import { useRouter } from '@/app/router'
import { subscribePayload } from '@/core/payloads'
import {
  INBOX_ID,
  PROJECT_COLORS,
  TASKS_ROUTE,
  TASKS_TOOL_ID,
  TASK_SORTS,
  completeTask,
  createProject,
  createSubtask,
  createTask,
  isOverdue,
  isSameDay,
  normalizeTask,
  reopenTask,
  samePage,
  startOfDay,
  withTime,
  type ProjectColor,
  type Task,
  type TaskProject,
  type TasksData,
} from '@/core/tasks/model'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import type { DueValue } from './DuePicker'
import { makeConfetti, playCompleteChime, type ConfettiBurst } from './effects'
import { useActivePage, useElementWidth, useNow, useTasksStore } from './hooks'
import { useDayWords } from './labels'
import {
  COMPLETED_PAGE,
  allLabels,
  buildSections,
  completedInView,
  draftFromCapture,
  findProject,
  formatDay,
  formatDue,
  mergeTasksData,
  parseTasksBackup,
  parseView,
  prettyUrl,
  sectionsToMarkdown,
  taskLoadByDay,
  tasksToBackup,
  viewCounts,
  viewId,
  viewProgress,
  type ParsedView,
} from './logic'
import { PageCapture } from './PageCapture'
import { ProjectDialog } from './ProjectDialog'
import { TaskComposer, type ComposerDefaults, type ComposerDraft, type TaskComposerHandle } from './TaskComposer'
import { TaskDetail } from './TaskDetail'
import { ProjectDot } from './TaskMeta'
import type { TaskRowActions } from './TaskRow'
import { TaskList, TaskSections } from './TaskSections'
import { TasksEmpty, type EmptyKind } from './TasksEmpty'
import { useToast } from '@/shared/components/toast/useToast'
import { ViewHeader } from './ViewHeader'
import { ViewNav } from './ViewNav'

const WIDE_LAYOUT = 640
const HIGHLIGHT_MS = 2400
const TODAY_VIEW: ParsedView = { kind: 'today' }

function replaceTasks(data: TasksData, snapshots: Task[], removeIds: string[] = []): TasksData {
  const ids = new Set([...snapshots.map((task) => task.id), ...removeIds])
  return { ...data, tasks: [...data.tasks.filter((task) => !ids.has(task.id)), ...snapshots] }
}

function pickColor(projects: TaskProject[], offset = 0): ProjectColor {
  const palette = PROJECT_COLORS.filter((color) => color !== 'gray')
  const used = new Set(projects.map((p) => p.color))
  return palette.find((color) => !used.has(color)) ?? palette[(projects.length + offset) % palette.length]
}

function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function TasksTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool(TASKS_TOOL_ID)
  const { search, navigate } = useRouter()
  const { data, mutate, prefs, updatePrefs } = useTasksStore()
  const now = useNow()
  const activePage = useActivePage()
  const words = useDayWords()
  const reduceMotion = useReducedMotion()

  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const toaster = useToast()
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [confetti, setConfetti] = useState<ConfettiBurst | null>(null)
  const [projectDialog, setProjectDialog] = useState<{ open: boolean; project: TaskProject | null }>({
    open: false,
    project: null,
  })
  const [dismissedPage, setDismissedPage] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [completedLimit, setCompletedLimit] = useState(COMPLETED_PAGE)
  const composerRef = useRef<TaskComposerHandle>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const width = useElementWidth(rootRef)
  const wide = width >= WIDE_LAYOUT

  const loaded = data != null
  const tasks = useMemo(() => data?.tasks ?? [], [data])
  const projects = useMemo(() => data?.projects ?? [], [data])
  const view = useMemo(() => (data ? parseView(prefs.view, data) : TODAY_VIEW), [data, prefs.view])
  const currentViewId = viewId(view)
  const activeQuery = searchOpen ? query.trim() : ''

  const counts = useMemo(() => viewCounts(tasks, now), [tasks, now])
  const labels = useMemo(() => allLabels(tasks), [tasks])
  const load = useMemo(() => taskLoadByDay(tasks), [tasks])
  const sections = useMemo(
    () => buildSections(view, tasks, projects, now, prefs.sort, activeQuery, completedLimit),
    [view, tasks, projects, now, prefs.sort, activeQuery, completedLimit],
  )
  const doneInView = useMemo(() => completedInView(view, tasks, now), [view, tasks, now])
  const progress = useMemo(() => viewProgress(view, tasks, now), [view, tasks, now])
  const openCount = sections.reduce((sum, section) => sum + section.tasks.length, 0)

  const deepLinkId = new URLSearchParams(search).get('task')
  const detailTask = tasks.find((task) => task.id === (selectedId ?? deepLinkId)) ?? null
  const pageTask = activePage
    ? (tasks.find((task) => !task.completed && task.link != null && samePage(task.link.url, activePage.url)) ?? null)
    : null
  const showPageCard =
    loaded && prefs.showPageCard && activePage != null && dismissedPage !== activePage.url && !activeQuery

  const composerDefaults = useMemo<ComposerDefaults>(() => {
    switch (view.kind) {
      case 'today':
      case 'upcoming':
        return { due: startOfDay(now), allDay: true, projectId: INBOX_ID, labels: [] }
      case 'project':
        return { due: null, allDay: true, projectId: view.project.id, labels: [] }
      case 'label':
        return { due: null, allDay: true, projectId: INBOX_ID, labels: [view.label] }
      default:
        return { due: null, allDay: true, projectId: INBOX_ID, labels: [] }
    }
  }, [view, now])

  // ── Feedback ────────────────────────────────────────────────────────────────

  const { show: showShared, undoCurrent } = toaster
  const showToast = useCallback(
    (message: string, undo?: () => void) => showShared(message, { undo }),
    [showShared],
  )

  const flashTask = (id: string) => {
    clearTimeout(highlightTimer.current)
    setHighlightId(id)
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
  }

  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  const restore = (snapshots: Task[], removeIds: string[] = []) => {
    void mutate((current) => replaceTasks(current, snapshots, removeIds))
  }

  const dueWords = (task: Pick<Task, 'due' | 'allDay'>, at: number) =>
    task.due == null ? t('tasks.toast.noDate') : formatDue(task.due, task.allDay, at, words)

  // ── Task actions ────────────────────────────────────────────────────────────

  const updateTask = (task: Task, patch: Partial<Task>) => {
    const stamp = Date.now()
    void mutate((current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === task.id ? normalizeTask({ ...item, ...patch, id: item.id, updatedAt: stamp }) : item,
      ),
    }))
  }

  const celebrateIfClear = (completedId: string, stamp: number) => {
    if (view.kind !== 'today') return
    const remaining = tasks.some(
      (task) =>
        task.id !== completedId &&
        !task.completed &&
        task.due != null &&
        (isOverdue(task, stamp) || isSameDay(task.due, stamp)),
    )
    if (remaining) return
    if (!reduceMotion) {
      setConfetti(makeConfetti())
      setTimeout(() => setConfetti(null), 1600)
    }
  }

  const toggleTask = (task: Task) => {
    const stamp = Date.now()
    if (task.completed) {
      void mutate((current) => ({
        ...current,
        tasks: current.tasks.map((item) => (item.id === task.id ? reopenTask(item, stamp) : item)),
      }))
      showToast(t('tasks.toast.reopened', { title: task.title }), () => restore([task]))
      return
    }
    const { rolledTo } = completeTask(task, stamp)
    void mutate((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? completeTask(item, stamp).task : item)),
    }))
    if (prefs.sound) playCompleteChime()
    showToast(
      rolledTo != null
        ? t('tasks.toast.rolled', { when: formatDue(rolledTo, task.allDay, stamp, words) })
        : t('tasks.toast.completed', { title: task.title }),
      () => restore([task]),
    )
    celebrateIfClear(task.id, stamp)
  }

  const removeTask = (task: Task) => {
    void mutate((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))
    showToast(t('tasks.toast.deleted', { title: task.title }), () => restore([task]))
  }

  const duplicateTask = (task: Task) => {
    const copy = createTask(
      {
        ...task,
        subtasks: task.subtasks.map((subtask) => ({ ...createSubtask(subtask.title), done: subtask.done })),
      },
      Date.now(),
    )
    void mutate((current) => {
      const index = current.tasks.findIndex((item) => item.id === task.id)
      const next = [...current.tasks]
      next.splice(index < 0 ? next.length : index + 1, 0, copy)
      return { ...current, tasks: next }
    })
    flashTask(copy.id)
    showToast(t('tasks.toast.duplicated'), () => restore([], [copy.id]))
  }

  const copyTask = (task: Task) => {
    const text = task.link ? `${task.title}\n${task.link.url}` : task.title
    void navigator.clipboard.writeText(text).then(
      () => showToast(t('tasks.toast.copied')),
      () => showToast(t('tasks.toast.copyFailed')),
    )
  }

  const rowActions: TaskRowActions = {
    toggle: toggleTask,
    open: (task) => setSelectedId(task.id),
    update: updateTask,
    remove: removeTask,
    duplicate: duplicateTask,
  }

  const closeDetail = () => {
    setSelectedId(null)
    if (deepLinkId) navigate(TASKS_ROUTE)
  }

  const addDrafts = (drafts: ComposerDraft[]) => {
    const stamp = Date.now()
    const newProjects: TaskProject[] = []
    const created = drafts.map((draft) => {
      let projectId = draft.projectId
      if (draft.newProjectName) {
        const known = findProject(draft.newProjectName, [...projects, ...newProjects])
        const project =
          known ?? createProject(draft.newProjectName, pickColor([...projects, ...newProjects]), stamp)
        if (!known) newProjects.push(project)
        projectId = project.id
      }
      return createTask(
        {
          title: draft.title,
          notes: draft.notes,
          due: draft.due,
          allDay: draft.allDay,
          recurrence: draft.recurrence,
          ...(draft.reminder !== undefined ? { reminder: draft.reminder } : {}),
          priority: draft.priority,
          projectId,
          labels: draft.labels,
          link: draft.link,
        },
        stamp,
      )
    })
    if (!created.length) return
    void mutate((current) => ({
      projects: [...current.projects, ...newProjects],
      tasks: [...current.tasks, ...created],
    }))
    const last = created[created.length - 1]
    flashTask(last.id)
    showToast(
      created.length > 1
        ? t('tasks.toast.addedMany', { count: created.length })
        : t('tasks.toast.added', { when: dueWords(last, stamp) }),
      () => restore([], created.map((task) => task.id)),
    )
  }

  const addPage = (due: DueValue) => {
    if (!activePage) return
    const stamp = Date.now()
    const task = createTask(
      {
        title: activePage.title.trim() || prettyUrl(activePage.url),
        due: due.due,
        allDay: due.allDay,
        recurrence: due.due == null ? 'none' : due.recurrence,
        reminder: due.due == null ? null : due.allDay ? due.reminder : (due.reminder ?? 0),
        projectId: view.kind === 'project' ? view.project.id : INBOX_ID,
        labels: view.kind === 'label' ? [view.label] : [],
        link: {
          url: activePage.url,
          title: activePage.title,
          ...(activePage.favIconUrl ? { favIconUrl: activePage.favIconUrl } : {}),
        },
      },
      stamp,
    )
    void mutate((current) => ({ ...current, tasks: [...current.tasks, task] }))
    flashTask(task.id)
    showToast(t('tasks.toast.pageSaved', { when: dueWords(task, stamp) }), () => restore([], [task.id]))
  }

  const rescheduleOverdue = (value: DueValue) => {
    if (value.due == null) return
    const day = startOfDay(value.due)
    const stamp = Date.now()
    const overdue = tasks.filter((task) => isOverdue(task, stamp))
    if (!overdue.length) return
    const ids = new Set(overdue.map((task) => task.id))
    void mutate((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (!ids.has(task.id) || task.due == null) return task
        const due = task.allDay ? day : withTime(day, new Date(task.due).getHours(), new Date(task.due).getMinutes())
        return { ...task, due, updatedAt: stamp }
      }),
    }))
    showToast(t('tasks.toast.rescheduled', { count: overdue.length, when: formatDay(day, stamp, words) }), () =>
      restore(overdue),
    )
  }

  // ── Projects ────────────────────────────────────────────────────────────────

  const saveProject = (name: string, color: ProjectColor) => {
    const editing = projectDialog.project
    if (editing) {
      void mutate((current) => ({
        ...current,
        projects: current.projects.map((p) => (p.id === editing.id ? { ...p, name, color } : p)),
      }))
      return
    }
    const project = createProject(name, color)
    void mutate((current) => ({ ...current, projects: [...current.projects, project] }))
    updatePrefs({ view: `project:${project.id}` })
  }

  const deleteProject = (project: TaskProject) => {
    const moved = tasks.filter((task) => task.projectId === project.id)
    const stamp = Date.now()
    void mutate((current) => ({
      projects: current.projects.filter((p) => p.id !== project.id),
      tasks: current.tasks.map((task) =>
        task.projectId === project.id ? { ...task, projectId: INBOX_ID, updatedAt: stamp } : task,
      ),
    }))
    updatePrefs({ view: 'inbox' })
    showToast(t('tasks.toast.projectDeleted', { name: project.name, count: moved.length }), () => {
      void mutate((current) => ({
        projects: current.projects.some((p) => p.id === project.id) ? current.projects : [...current.projects, project],
        tasks: replaceTasks(current, moved).tasks,
      }))
      updatePrefs({ view: `project:${project.id}` })
    })
  }

  // ── Bulk & export ───────────────────────────────────────────────────────────

  const clearCompleted = () => {
    const done = tasks.filter((task) => task.completed)
    if (!done.length) return
    void mutate((current) => ({ ...current, tasks: current.tasks.filter((task) => !task.completed) }))
    showToast(t('tasks.toast.clearedCompleted', { count: done.length }), () => restore(done))
  }

  const viewTitle = (() => {
    switch (view.kind) {
      case 'project':
        return view.project.name
      case 'label':
        return `@${view.label}`
      default:
        return t(`tasks.views.${view.kind}`)
    }
  })()

  const copyMarkdown = () => {
    const markdown = sectionsToMarkdown(
      viewTitle,
      sections.map((section) => ({
        title:
          section.date != null
            ? formatDay(section.date, now, words)
            : section.kind === 'overdue'
              ? t('tasks.sections.overdue')
              : section.kind === 'later'
                ? t('tasks.sections.later')
                : viewTitle,
        tasks: section.tasks,
      })),
      now,
      words,
    )
    void navigator.clipboard.writeText(markdown).then(
      () => showToast(t('tasks.toast.markdownCopied')),
      () => showToast(t('tasks.toast.copyFailed')),
    )
  }

  const exportBackup = () => {
    if (!data) return
    downloadText(`tasks-backup-${new Date().toISOString().slice(0, 10)}.json`, tasksToBackup(data), 'application/json')
  }

  const importBackup = async (file: File) => {
    try {
      const incoming = parseTasksBackup(await file.text())
      await mutate((current) => mergeTasksData(current, incoming))
      showToast(t('tasks.toast.imported', { count: incoming.tasks.length }))
    } catch {
      showToast(t('tasks.toast.importFailed'))
    }
  }

  // ── Capture from context menu & keyboard command ────────────────────────────

  const viewRef = useRef(prefs.view)
  useEffect(() => {
    viewRef.current = prefs.view
  })

  const leaveCompletedView = useCallback(() => {
    if (viewRef.current === 'completed') updatePrefs({ view: 'inbox' })
  }, [updatePrefs])

  useEffect(() => {
    if (!loaded) return
    return subscribePayload(TASKS_TOOL_ID, (payload) => {
      setSearchOpen(false)
      setQuery('')
      setSelectedId(null)
      leaveCompletedView()
      requestAnimationFrame(() => composerRef.current?.prefill(draftFromCapture(payload)))
    })
  }, [loaded, leaveCompletedView])

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      const typing =
        target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') != null
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing && undoCurrent()) {
        event.preventDefault()
        return
      }
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      if (event.key === 'q' || event.key === 'n') {
        event.preventDefault()
        leaveCompletedView()
        setSearchOpen(false)
        requestAnimationFrame(() => composerRef.current?.focus())
      } else if (event.key === '/') {
        event.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leaveCompletedView, undoCurrent])

  // ── Rendering ───────────────────────────────────────────────────────────────

  const selectView = (id: string) => {
    updatePrefs({ view: id })
    setShowDone(false)
    setCompletedLimit(COMPLETED_PAGE)
    if (searchOpen && !query.trim()) setSearchOpen(false)
  }

  const subtitle = (() => {
    switch (view.kind) {
      case 'today':
        return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now)
      case 'upcoming':
        return t('tasks.subtitle.upcoming')
      case 'completed':
        return t('tasks.subtitle.completed', { count: tasks.filter((task) => task.completed).length })
      default:
        return t('tasks.subtitle.open', { count: openCount })
    }
  })()

  const emptyKind: EmptyKind = activeQuery
    ? 'search'
    : view.kind === 'today'
      ? progress && progress.done > 0
        ? 'todayDone'
        : 'today'
      : view.kind

  const headerActions = (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-pressed={searchOpen}
        onClick={() => {
          setSearchOpen((open) => !open)
          if (!searchOpen) requestAnimationFrame(() => searchRef.current?.focus())
          else setQuery('')
        }}
        aria-label={t('tasks.search.toggle')}
        title={`${t('tasks.search.toggle')} (/)`}
        className={cn(searchOpen && 'bg-accent text-foreground')}
      >
        <SearchIcon />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t('tasks.options')} title={t('tasks.options')}>
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 [&_svg]:size-4">
              <ArrowDownUpIcon />
              {t('tasks.sort.label')}
              <span className="ml-auto text-xs text-muted-foreground">{t(`tasks.sort.${prefs.sort}`)}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TASK_SORTS.map((sort) => (
                <DropdownMenuCheckboxItem
                  key={sort}
                  checked={prefs.sort === sort}
                  onCheckedChange={() => updatePrefs({ sort })}
                >
                  {t(`tasks.sort.${sort}`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuCheckboxItem
            checked={prefs.showPageCard}
            onCheckedChange={(value) => updatePrefs({ showPageCard: value === true })}
          >
            {t('tasks.menu.pageCard')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={prefs.sound}
            onCheckedChange={(value) => {
              updatePrefs({ sound: value === true })
              if (value === true) playCompleteChime()
            }}
          >
            {t('tasks.menu.sound')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!openCount} onSelect={copyMarkdown}>
            <ClipboardCopyIcon className="size-4" />
            {t('tasks.menu.copyMarkdown')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!tasks.length} onSelect={exportBackup}>
            <DownloadIcon className="size-4" />
            {t('tasks.menu.export')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            <UploadIcon className="size-4" />
            {t('tasks.menu.import')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!tasks.some((task) => task.completed)}
            onSelect={clearCompleted}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="size-4" />
            {t('tasks.menu.clearCompleted')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] leading-relaxed font-normal text-muted-foreground">
            {t('tasks.menu.shortcuts')}
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const projectActions =
    view.kind === 'project' ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={t('tasks.project.actions')} title={t('tasks.project.actions')}>
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setProjectDialog({ open: true, project: view.project })}>
            <PencilIcon className="size-4" />
            {t('tasks.project.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => deleteProject(view.project)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="size-4" />
            {t('tasks.project.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  const nav = (
    <ViewNav
      current={currentViewId}
      counts={counts}
      projects={projects}
      labels={labels}
      layout={wide ? 'sidebar' : 'rail'}
      todayDate={now}
      onSelect={selectView}
      onAddProject={() => setProjectDialog({ open: true, project: null })}
    />
  )

  return (
    <ToolPage tool={tool} actions={headerActions} contentClassName="overflow-hidden p-0">
      <MotionConfig reducedMotion="user">
        <div ref={rootRef} className="flex min-h-0 flex-1">
          {wide && (
            <aside className="flex min-h-0 shrink-0 border-r py-[var(--density-page-pad)] pl-[var(--density-page-pad)]">
              {nav}
            </aside>
          )}
          <div className="@container flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-col gap-2 px-[var(--density-page-pad)] pt-[var(--density-page-pad)]">
              {!wide && nav}
              <AnimatePresence initial={false}>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                    className="relative"
                  >
                    <SearchIcon
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      ref={searchRef}
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          event.stopPropagation()
                          if (query) setQuery('')
                          else setSearchOpen(false)
                        }
                      }}
                      placeholder={t('tasks.search.placeholder')}
                      aria-label={t('tasks.search.placeholder')}
                      className="h-9 w-full rounded-lg border border-input bg-background pr-9 pl-9 text-[13px] shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="absolute top-1/2 right-1.5 size-6 -translate-y-1/2 text-muted-foreground"
                        onClick={() => {
                          setQuery('')
                          searchRef.current?.focus()
                        }}
                        aria-label={t('common.clear')}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="scrollbar-styled flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[var(--density-page-pad)] pt-3 pb-20 *:shrink-0">
              {!loaded ? (
                <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('nav.loading')}>
                  <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="size-[18px] animate-pulse rounded-full bg-muted" />
                      <div className="h-4 flex-1 animate-pulse rounded bg-muted" style={{ maxWidth: `${80 - i * 12}%` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {!activeQuery && (
                    <ViewHeader
                      title={viewTitle}
                      subtitle={subtitle}
                      icon={view.kind === 'project' ? <ProjectDot color={view.project.color} className="size-3" /> : undefined}
                      progress={progress}
                      confetti={confetti}
                      actions={projectActions}
                    />
                  )}

                  <AnimatePresence initial={false}>
                    {showPageCard && activePage && (
                      <PageCapture
                        key="page"
                        page={activePage}
                        existing={pageTask}
                        now={now}
                        load={load}
                        onAdd={addPage}
                        onEdit={() =>
                          composerRef.current?.prefill({
                            title: activePage.title.trim() || prettyUrl(activePage.url),
                            link: {
                              url: activePage.url,
                              title: activePage.title,
                              ...(activePage.favIconUrl ? { favIconUrl: activePage.favIconUrl } : {}),
                            },
                          })
                        }
                        onOpen={(task) => setSelectedId(task.id)}
                        onDismiss={() => setDismissedPage(activePage.url)}
                      />
                    )}
                  </AnimatePresence>

                  <div className={cn((activeQuery || view.kind === 'completed') && 'hidden')}>
                    <TaskComposer
                      ref={composerRef}
                      projects={projects}
                      knownLabels={labels}
                      defaults={composerDefaults}
                      now={now}
                      load={load}
                      activePage={activePage}
                      onSubmit={addDrafts}
                    />
                  </div>

                  <motion.div
                    key={activeQuery ? 'search' : currentViewId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className="flex flex-col gap-4"
                  >
                    {openCount > 0 ? (
                      <TaskSections
                        sections={sections}
                        view={view}
                        projects={projects}
                        now={now}
                        words={words}
                        load={load}
                        highlightId={highlightId}
                        actions={rowActions}
                        onRescheduleOverdue={rescheduleOverdue}
                      />
                    ) : (
                      <TasksEmpty kind={emptyKind} query={activeQuery} />
                    )}

                    {view.kind === 'completed' && !activeQuery && openCount >= completedLimit && (
                      <Button
                        size="xs"
                        variant="outline"
                        className="self-center"
                        onClick={() => setCompletedLimit((limit) => limit + COMPLETED_PAGE)}
                      >
                        {t('tasks.loadMore')}
                      </Button>
                    )}

                    {!activeQuery && doneInView.length > 0 && (
                      <section>
                        <button
                          type="button"
                          onClick={() => setShowDone((open) => !open)}
                          aria-expanded={showDone}
                          className="flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 text-[12px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <motion.span animate={{ rotate: showDone ? 90 : 0 }} transition={{ duration: 0.18 }}>
                            <ChevronRightIcon className="size-3.5" aria-hidden />
                          </motion.span>
                          {t('tasks.completedToggle', { count: doneInView.length })}
                        </button>
                        <AnimatePresence initial={false}>
                          {showDone && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, transition: { duration: 0.12 } }}
                            >
                              <TaskList
                                tasks={doneInView}
                                projects={projects}
                                now={now}
                                words={words}
                                load={load}
                                highlightId={null}
                                actions={rowActions}
                                showProject={view.kind !== 'project'}
                                timeOnly={false}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    )}
                  </motion.div>

                  {view.kind === 'today' && !activeQuery && tasks.length === 0 && (
                    <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-muted-foreground">
                      <ListTodoIcon className="size-3.5" aria-hidden />
                      {t('tasks.tip')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <TaskDetail
          task={detailTask}
          projects={projects}
          knownLabels={labels}
          now={now}
          load={load}
          activePage={activePage}
          actions={{ update: updateTask, toggle: toggleTask, remove: removeTask, duplicate: duplicateTask, copy: copyTask }}
          onClose={closeDetail}
        />
        <ProjectDialog
          open={projectDialog.open}
          project={projectDialog.project}
          suggestedColor={pickColor(projects)}
          onOpenChange={(open) => setProjectDialog((state) => ({ ...state, open }))}
          onSave={saveProject}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importBackup(file)
            event.target.value = ''
          }}
        />
      </MotionConfig>
    </ToolPage>
  )
}
