import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import { RouterProvider } from '@/app/router'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { showTimerCompleteOverlay, timerOverlayTheme } from '@/chrome/background/timer/overlay'
import { TIMER_STORAGE_KEY, type TimerSnapshot } from '@/core/timer/model'
import TimerTool from '@/tools/productivity/timer/Tool'
import { resetChromeMockStorage } from './setup'

registerModules()

function renderTool() {
  window.location.hash = '#/tools/productivity/timer'
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <RouterProvider>
          <TimerTool />
        </RouterProvider>
      </TooltipProvider>
    </I18nextProvider>,
  )
}

async function storedTimer() {
  const result = await chrome.storage.local.get(TIMER_STORAGE_KEY)
  return result[TIMER_STORAGE_KEY] as TimerSnapshot
}

afterEach(() => {
  cleanup()
  document.getElementById('tbx-timer-complete')?.remove()
  resetChromeMockStorage()
})

describe('timer completion card', () => {
  it('announces itself without taking focus and stays until it is dismissed', async () => {
    const focused = document.createElement('input')
    document.body.append(focused)
    focused.focus()
    showTimerCompleteOverlay("Time's up", 'Tea finished.')
    const host = document.getElementById('tbx-timer-complete')!
    const shadow = host.shadowRoot!
    expect(host.getAttribute('role')).toBe('alert')
    expect(shadow.textContent).toContain("Time's up")
    expect(shadow.textContent).toContain('Tea finished.')
    expect(document.activeElement).toBe(focused)
    shadow
      .querySelector('button[aria-label="Dismiss"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await vi.waitFor(() => expect(document.getElementById('tbx-timer-complete')).toBeNull())
    focused.remove()
  })

  it('uses the toolbox theme and palette', () => {
    showTimerCompleteOverlay("Time's up", 'Tea finished.', timerOverlayTheme('dark', 'emerald'))
    const css = document
      .getElementById('tbx-timer-complete')!
      .shadowRoot!.querySelector('style')!.textContent
    expect(css).toContain('--tbx-accent:#34d399')
    expect(css).toContain('--tbx-card:#1c2022')
    expect(css).toContain('color-scheme:dark')
    expect(css).not.toContain('prefers-color-scheme')
  })

  it('follows the system scheme when the toolbox theme is system', () => {
    showTimerCompleteOverlay("Time's up", 'Tea finished.', timerOverlayTheme('system', 'ocean'))
    const css = document
      .getElementById('tbx-timer-complete')!
      .shadowRoot!.querySelector('style')!.textContent
    expect(css).toContain('@media (prefers-color-scheme: dark)')
    expect(css).toContain('--tbx-accent:#0284c7')
    expect(css).toContain('--tbx-accent:#38bdf8')
  })
})

describe('Timer tool', () => {
  it('shows equal preset choices and starts a countdown that is stored for the background', async () => {
    const user = userEvent.setup()
    renderTool()

    expect(await screen.findByRole('tab', { name: 'Countdown' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Stopwatch' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pomodoro' })).toBeInTheDocument()
    for (const minutes of [1, 5, 10, 15, 25, 30, 45, 60]) {
      expect(screen.getByRole('button', { name: `${minutes} min` })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'Hours' })).toHaveValue('0')
    expect(screen.getByRole('textbox', { name: 'Minutes' })).toHaveValue('5')
    expect(screen.getByRole('textbox', { name: 'Seconds' })).toHaveValue('0')
    expect(screen.getByRole('timer')).toHaveTextContent('00:05:00')

    await user.click(screen.getByRole('button', { name: '60 min' }))
    await waitFor(async () => {
      const stored = await storedTimer()
      expect(stored.countdown.hours).toBe(1)
      expect(stored.countdown.minutes).toBe(0)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('01:00:00')

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(async () => {
      const stored = await storedTimer()
      expect(stored.countdown.status).toBe('running')
      expect(stored.countdown.endAt).toEqual(expect.any(Number))
    })
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByText(/Keeps running if you close this panel/)).toBeInTheDocument()
  })

  it('records a stopwatch lap and shows split and total columns', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('tab', { name: 'Stopwatch' }))
    expect(screen.getByRole('button', { name: 'Lap' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    const lap = await screen.findByRole('button', { name: 'Lap' })
    await waitFor(() => expect(lap).toBeEnabled())
    await user.click(lap)
    await waitFor(async () => {
      const stored = await storedTimer()
      expect(stored.stopwatch.laps).toHaveLength(1)
    })
    expect(screen.getAllByText('Split').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0)
  })

  it('keeps pomodoro length and phase choices aligned', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(await screen.findByRole('tab', { name: 'Pomodoro' }))
    expect(screen.getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Short break' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Long break' })).toBeInTheDocument()
    expect(screen.getByText('Round 1 of 4')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Focus (min)' })).toHaveValue('25')
    expect(screen.getByRole('switch', { name: 'Start the next phase automatically' })).toBeChecked()
  })
})
