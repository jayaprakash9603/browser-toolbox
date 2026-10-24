import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import ReadAloudTool from '@/tools/text/read-aloud/Tool'
import { useVoices } from '@/tools/text/read-aloud/useSpeechReader'

vi.mock('@/tools/web/tabMessaging', () => ({
  sendToActiveTab: vi.fn(async (message: { scope?: string }) =>
    message.scope === 'selection'
      ? { title: 'Docs', url: 'https://docs.example.com/a', lang: 'en', blocks: [{ type: 'paragraph', text: 'Picked words.' }] }
      : {
          title: 'Compound interest',
          url: 'https://www.quickcalci.com/finance',
          lang: 'en-US',
          blocks: [
            { type: 'heading', text: 'Compound interest' },
            { type: 'paragraph', text: 'Interest earns interest. Start early to benefit.' },
          ],
        },
  ),
}))

registerModules()

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onboundary: ((event: { name: string; charIndex: number; charLength?: number }) => void) | null = null
  text: string
  constructor(text: string) {
    this.text = text
  }
}

const spoken: FakeUtterance[] = []
let voiceList: SpeechSynthesisVoice[] = []
const synth = {
  speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  paused: false,
  getVoices: vi.fn(() => voiceList),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

function lastSpoken() {
  return spoken.at(-1)!
}

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ReadAloudTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  spoken.length = 0
  voiceList = [{ voiceURI: 'en', name: 'Test English', lang: 'en-US', localService: true, default: true }]
  vi.clearAllMocks()
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance })
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance')
  Reflect.deleteProperty(window, 'speechSynthesis')
})

describe('Read Aloud', () => {
  it('picks up voices after Chromium returns an empty list first', async () => {
    voiceList = []
    const { result, unmount } = renderHook(() => useVoices())
    expect(result.current).toEqual([])
    voiceList = [{ voiceURI: 'en', name: 'Late English', lang: 'en-US', localService: true, default: true }]
    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current[0].name).toBe('Late English')
    unmount()
  })

  it('loads the page as separate, clickable sentences', async () => {
    renderTool()
    expect(await screen.findByRole('button', { name: 'Interest earns interest.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start early to benefit.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Compound interest' })).toBeInTheDocument()
    expect(screen.getByText(/quickcalci\.com · 9 words/)).toBeInTheDocument()
  })

  it('reads one sentence at a time and pauses on the current one', async () => {
    const user = userEvent.setup()
    renderTool()
    await screen.findByRole('button', { name: 'Interest earns interest.' })

    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(lastSpoken().text).toBe('Compound interest')
    expect(lastSpoken().voice?.voiceURI).toBe('en')

    act(() => lastSpoken().onend?.())
    expect(lastSpoken().text).toBe('Interest earns interest.')
    expect(screen.getByRole('button', { name: 'Interest earns interest.' })).toHaveAttribute('aria-current', 'true')

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(synth.cancel).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Paused')

    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(lastSpoken().text).toBe('Interest earns interest.')

    await user.click(screen.getByRole('button', { name: 'Next sentence' }))
    expect(lastSpoken().text).toBe('Start early to benefit.')

    act(() => lastSpoken().onend?.())
    expect(screen.getByRole('status')).toHaveTextContent('Finished reading')
    expect(screen.getByRole('button', { name: 'Replay from start' })).toBeInTheDocument()
  })

  it('ignores the end event of a cancelled sentence', async () => {
    const user = userEvent.setup()
    renderTool()
    await screen.findByRole('button', { name: 'Interest earns interest.' })

    await user.click(screen.getByRole('button', { name: 'Play' }))
    const first = lastSpoken()
    await user.click(screen.getByRole('button', { name: 'Start early to benefit.' }))
    const count = spoken.length
    act(() => first.onend?.())
    expect(spoken).toHaveLength(count)
    expect(lastSpoken().text).toBe('Start early to benefit.')
  })

  it('reads typed text and toggles with the space bar', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(screen.getByRole('tab', { name: /Your text/ }))
    await user.click(screen.getByLabelText('Text to read'))
    await user.paste('Hello there. General Kenobi.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled())

    screen.getByLabelText('Text to read').blur()
    await user.keyboard(' ')
    expect(lastSpoken().text).toBe('Hello there.')
    expect(screen.getByRole('button', { name: 'Edit text' })).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(lastSpoken().text).toBe('General Kenobi.')

    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Text to read')).toHaveValue('Hello there. General Kenobi.')
  })

  it('shows a clear message when speech is unavailable', async () => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    renderTool()
    expect(await screen.findByText("Speech isn't available")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
  })
})
