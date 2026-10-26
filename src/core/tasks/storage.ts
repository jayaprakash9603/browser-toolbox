import {
  DEFAULT_TASK_PREFS,
  TASK_PREFS_KEY,
  TASK_REMINDERS_KEY,
  TASK_SORTS,
  TASKS_STORAGE_KEY,
  normalizeTasksData,
  type ReminderLog,
  type TaskPrefs,
  type TasksData,
} from './model'

let queue: Promise<unknown> = Promise.resolve()

export async function loadTasks(): Promise<TasksData> {
  try {
    const stored = await chrome.storage.local.get(TASKS_STORAGE_KEY)
    return normalizeTasksData(stored[TASKS_STORAGE_KEY])
  } catch {
    return normalizeTasksData(null)
  }
}

export async function saveTasks(data: TasksData): Promise<void> {
  await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: data })
}

/**
 * Read-modify-write against storage so the panel and the background (notification buttons)
 * never overwrite each other's changes with a stale copy.
 */
export function updateTasks(mutate: (current: TasksData) => TasksData): Promise<TasksData> {
  const run = queue.then(async () => {
    const next = mutate(await loadTasks())
    await saveTasks(next)
    return next
  })
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function watchTasks(listener: (data: TasksData) => void): () => void {
  const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes[TASKS_STORAGE_KEY]) {
      listener(normalizeTasksData(changes[TASKS_STORAGE_KEY].newValue))
    }
  }
  chrome.storage.onChanged.addListener(onChanged)
  return () => chrome.storage.onChanged.removeListener(onChanged)
}

export async function loadReminderLog(): Promise<ReminderLog> {
  try {
    const stored = await chrome.storage.local.get(TASK_REMINDERS_KEY)
    const value = stored[TASK_REMINDERS_KEY]
    return value && typeof value === 'object' ? (value as ReminderLog) : {}
  } catch {
    return {}
  }
}

export async function saveReminderLog(log: ReminderLog): Promise<void> {
  await chrome.storage.local.set({ [TASK_REMINDERS_KEY]: log })
}

export async function loadTaskPrefs(): Promise<TaskPrefs> {
  try {
    const stored = await chrome.storage.local.get(TASK_PREFS_KEY)
    const value = { ...DEFAULT_TASK_PREFS, ...(stored[TASK_PREFS_KEY] as Partial<TaskPrefs> | undefined) }
    if (!TASK_SORTS.includes(value.sort)) value.sort = DEFAULT_TASK_PREFS.sort
    if (typeof value.view !== 'string' || !value.view) value.view = DEFAULT_TASK_PREFS.view
    return value
  } catch {
    return { ...DEFAULT_TASK_PREFS }
  }
}

export async function saveTaskPrefs(prefs: TaskPrefs): Promise<void> {
  await chrome.storage.local.set({ [TASK_PREFS_KEY]: prefs })
}
