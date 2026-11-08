import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { stashPayload } from '@/core/payloads'
import { TASKS_STORAGE_KEY, addDays, createTask, startOfDay, type TasksData } from '@/core/tasks/model'
import { ToastProvider } from '@/shared/components/toast/ToastProvider'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import TasksTool from '@/tools/productivity/tasks/Tool'
import { resetChromeMockStorage } from './setup'

registerModules()

// The toast UI is a lazy chunk; load it up front so toasts render within findBy's timeout.
beforeAll(async () => {
  await import('@/shared/components/toast/Toaster')
}, 60_000)

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ToastProvider>
          <TasksTool />
        </ToastProvider>
      </TooltipProvider>
    </I18nextProvider>,
  )
}

async function stored(): Promise<TasksData> {
  const result = await chrome.storage.local.get(TASKS_STORAGE_KEY)
  return (result[TASKS_STORAGE_KEY] as TasksData | undefined) ?? { tasks: [], projects: [] }
}

beforeEach(() => {
  resetChromeMockStorage()
  window.location.hash = '#/tools/productivity/tasks'
})

afterEach(() => {
  cleanup()
})

describe('Tasks tool', { timeout: 20_000 }, () => {
  it('shows an empty Today view with the current page ready to capture', async () => {
    renderTool()
    expect(await screen.findByText('Nothing due today')).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Current page' })
    expect(within(card).getAllByText('example.com').length).toBeGreaterThan(0)
    expect(within(card).getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument()
  })

  it('adds a task from natural language and creates the named project', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('button', { name: /Add task/ }))
    const input = await screen.findByRole('textbox', { name: 'Task name' })
    fireEvent.change(input, { target: { value: 'Read docs tomorrow 5pm p1 #Work @reading' } })

    expect(await screen.findByText('New project “Work”')).toBeInTheDocument()
    expect(screen.getByText('Priority 1')).toBeInTheDocument()
    expect(screen.getByText('reading')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(async () => expect((await stored()).tasks).toHaveLength(1))
    const data = await stored()
    expect(data.projects).toMatchObject([{ name: 'Work' }])
    expect(data.tasks[0]).toMatchObject({
      title: 'Read docs',
      priority: 1,
      labels: ['reading'],
      allDay: false,
      reminder: 0,
      projectId: data.projects[0].id,
    })
    expect(new Date(data.tasks[0].due as number).getHours()).toBe(17)
    expect(await screen.findByText(/Task added · Tomorrow/)).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('completes a task after the check animation and can undo it', async () => {
    const user = userEvent.setup()
    const task = createTask({ title: 'Water the plants', due: startOfDay(Date.now()), allDay: true })
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: { tasks: [task], projects: [] } })
    renderTool()

    await user.click(await screen.findByRole('checkbox', { name: 'Complete “Water the plants”' }))
    await waitFor(async () => expect((await stored()).tasks[0].completed).toBe(true))
    expect(await screen.findByText('Completed “Water the plants”')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await stored()).tasks[0].completed).toBe(false))
  })

  it('saves the current page for tomorrow in one tap', async () => {
    const user = userEvent.setup()
    renderTool()
    const card = await screen.findByRole('region', { name: 'Current page' })
    await user.click(within(card).getByRole('button', { name: 'Tomorrow' }))

    await waitFor(async () => expect((await stored()).tasks).toHaveLength(1))
    const [task] = (await stored()).tasks
    expect(task.link?.url).toBe('https://example.com')
    expect(task.due).toBe(addDays(startOfDay(Date.now()), 1))
    expect(await within(card).findByText('Saved for Tomorrow')).toBeInTheDocument()
  })

  it('prefills the composer from a context-menu capture', async () => {
    await stashPayload({
      toolId: 'productivity.tasks',
      text: 'Reply to this thread',
      pageUrl: 'https://mail.example.com/t/1',
      pageTitle: 'Quarterly plan – Mail',
    })
    renderTool()
    const input = await screen.findByRole('textbox', { name: 'Task name' })
    await waitFor(() => expect(input).toHaveValue('Reply to this thread'))
    expect(screen.getByText('Quarterly plan – Mail')).toBeInTheDocument()
  })

  it('switches views and shows overdue tasks with a reschedule action', async () => {
    const user = userEvent.setup()
    const overdue = createTask({ title: 'Pay invoice', due: addDays(startOfDay(Date.now()), -2), allDay: true })
    const later = createTask({ title: 'Book flights', due: addDays(startOfDay(Date.now()), 3), allDay: true })
    await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: { tasks: [overdue, later], projects: [] } })
    renderTool()

    expect(await screen.findByText('Pay invoice')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument()
    expect(screen.queryByText('Book flights')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Upcoming/ }))
    expect(await screen.findByText('Book flights')).toBeInTheDocument()
  })
})

describe('Tasks strings', () => {
  it('defines every literal tasks.* key used by the UI', () => {
    const sources = import.meta.glob('/src/tools/productivity/tasks/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const missing: string[] = []
    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/\bt\(\s*'(tasks\.[^'$]+)'/g)) {
        const key = match[1]
        if (!i18n.exists(key) && !i18n.exists(key, { count: 2 })) missing.push(`${file}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })
})
