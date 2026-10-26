import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { stashPayload, type ToolPayload } from '@/core/payloads'
import {
  TASK_REMINDER_ALARM,
  TASK_REMINDERS_KEY,
  TASKS_ROUTE,
  TASKS_STORAGE_KEY,
  TASKS_TOOL_ID,
  completeTask,
  linkHost,
  planReminders,
  snoozeReminder,
  taskIdFromNotificationId,
  taskNotificationId,
  type Task,
  type TasksData,
} from '@/core/tasks/model'
import { loadReminderLog, loadTasks, saveReminderLog, updateTasks } from '@/core/tasks/storage'

export const TASK_MENU_IDS = {
  page: 'toolbox.tasks.page',
  link: 'toolbox.tasks.link',
  selection: 'toolbox.tasks.selection',
} as const

let chain: Promise<void> = Promise.resolve()
let listening = false

/** Reminder bookkeeping runs one step at a time so a snooze never races a reconcile. */
function serial(step: () => Promise<void>): Promise<void> {
  const run = chain.then(step)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function registerTasks(): void {
  if (listening) return
  listening = true
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TASK_REMINDER_ALARM) void reconcileTaskReminders()
  })
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[TASKS_STORAGE_KEY] || changes[TASK_REMINDERS_KEY])) {
      void reconcileTaskReminders()
    }
  })
  chrome.notifications.onClicked.addListener((id) => {
    const taskId = taskIdFromNotificationId(id)
    if (taskId) void openTaskFromNotification(taskId)
  })
  chrome.notifications.onButtonClicked.addListener((id, index) => {
    const taskId = taskIdFromNotificationId(id)
    if (!taskId) return
    void (index === 0 ? completeFromNotification(taskId) : snoozeFromNotification(taskId))
  })
  void reconcileTaskReminders()
}

export function reconcileTaskReminders(now = Date.now()): Promise<void> {
  return serial(async () => {
    const [data, log] = await Promise.all([loadTasks(), loadReminderLog()])
    const plan = planReminders(data.tasks, log, now)
    if (plan.changed) await saveReminderLog(plan.log)
    for (const task of plan.notify) await announce(task, data)
    await arm(plan.nextAt)
  })
}

async function arm(nextAt: number | null): Promise<void> {
  await chrome.alarms.clear(TASK_REMINDER_ALARM)
  if (nextAt == null) return
  try {
    await chrome.alarms.create(TASK_REMINDER_ALARM, { when: Math.max(nextAt, Date.now() + 500) })
  } catch {
    // An open Tasks panel still shows overdue work; the next storage change re-arms.
  }
}

function describeDue(task: Task): string {
  if (task.due == null) return ''
  const format = new Intl.DateTimeFormat(
    undefined,
    task.allDay
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  )
  return `${getChromeMessage('taskReminderDue')} ${format.format(task.due)}`.trim()
}

async function announce(task: Task, data: TasksData): Promise<void> {
  const project = data.projects.find((p) => p.id === task.projectId)
  const context = [project?.name, task.link ? linkHost(task.link.url) : ''].filter(Boolean).join(' · ')
  try {
    await chrome.notifications.create(taskNotificationId(task.id), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: task.title || getChromeMessage('taskReminderTitle'),
      message: describeDue(task),
      contextMessage: context || getChromeMessage('taskReminderTitle'),
      priority: 2,
      requireInteraction: true,
      silent: false,
      buttons: [
        { title: getChromeMessage('taskReminderComplete') },
        { title: getChromeMessage('taskReminderSnooze') },
      ],
    })
  } catch {
    /* notifications can be blocked */
  }
}

async function completeFromNotification(taskId: string): Promise<void> {
  await chrome.notifications.clear(taskNotificationId(taskId)).catch(() => undefined)
  const now = Date.now()
  await updateTasks((data) => ({
    ...data,
    tasks: data.tasks.map((t) => (t.id === taskId && !t.completed ? completeTask(t, now).task : t)),
  }))
}

function snoozeFromNotification(taskId: string): Promise<void> {
  void chrome.notifications.clear(taskNotificationId(taskId)).catch(() => undefined)
  return serial(async () => {
    const [data, log] = await Promise.all([loadTasks(), loadReminderLog()])
    const task = data.tasks.find((t) => t.id === taskId)
    if (task) await saveReminderLog(snoozeReminder(log, task, Date.now()))
  })
}

async function openTaskFromNotification(taskId: string): Promise<void> {
  await chrome.notifications.clear(taskNotificationId(taskId)).catch(() => undefined)
  const data = await loadTasks()
  const task = data.tasks.find((t) => t.id === taskId)
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] })
    const intent = setPanelRouteIntent(`${TASKS_ROUTE}?task=${encodeURIComponent(taskId)}`)
    if (win.id != null) await chrome.sidePanel.open({ windowId: win.id }).catch(() => undefined)
    await intent
    if (task?.link) await chrome.tabs.create({ url: task.link.url, ...(win.id != null ? { windowId: win.id } : {}) })
  } catch {
    /* no normal window to open into */
  }
}

// ── Capture: context menu and keyboard command ───────────────────────────────

type TaskSource = Omit<ToolPayload, 'toolId' | 'createdAt'>

/** Stash first, but open the panel in the same turn: awaiting before `open` can drop the gesture. */
function openTasksWith(source: TaskSource, windowId: number | undefined): Promise<void> {
  const ready = Promise.all([
    stashPayload({ toolId: TASKS_TOOL_ID, ...source }),
    setPanelRouteIntent(TASKS_ROUTE),
  ])
  const opened = windowId != null ? chrome.sidePanel.open({ windowId }).catch(() => undefined) : undefined
  return Promise.all([ready, opened]).then(() => undefined)
}

function pageSource(tab: chrome.tabs.Tab | undefined, pageUrl?: string): TaskSource {
  return {
    pageUrl: pageUrl ?? tab?.url,
    ...(tab?.title ? { pageTitle: tab.title } : {}),
    ...(tab?.favIconUrl ? { favIconUrl: tab.favIconUrl } : {}),
  }
}

export function buildTaskMenus(create: (properties: chrome.contextMenus.CreateProperties) => void): void {
  create({
    id: TASK_MENU_IDS.page,
    parentId: 'toolbox.root',
    title: getChromeMessage('contextMenuTaskPage'),
    contexts: ['page', 'frame'],
  })
  create({
    id: TASK_MENU_IDS.link,
    parentId: 'toolbox.root',
    title: getChromeMessage('contextMenuTaskLink'),
    contexts: ['link'],
  })
  create({
    id: TASK_MENU_IDS.selection,
    parentId: 'toolbox.root',
    title: getChromeMessage('contextMenuTaskSelection'),
    contexts: ['selection'],
  })
}

export function isTaskMenuItem(menuItemId: string): boolean {
  return (Object.values(TASK_MENU_IDS) as string[]).includes(menuItemId)
}

export function handleTaskMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  const id = String(info.menuItemId)
  if (id === TASK_MENU_IDS.link && info.linkUrl) {
    return openTasksWith({ linkUrl: info.linkUrl, text: info.selectionText }, tab?.windowId)
  }
  if (id === TASK_MENU_IDS.selection && info.selectionText) {
    return openTasksWith({ ...pageSource(tab, info.pageUrl), text: info.selectionText }, tab?.windowId)
  }
  return openTasksWith(pageSource(tab, info.pageUrl), tab?.windowId)
}

export function addPageAsTask(tab: chrome.tabs.Tab | undefined): Promise<void> {
  return openTasksWith(pageSource(tab), tab?.windowId)
}
