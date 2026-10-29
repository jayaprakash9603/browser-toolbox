import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SelectorCandidate, SelectorSnapshot } from '@/core/engines/selector-studio'
import { SelectorStudioView } from '@/features/selector-studio/components/SelectorStudioView'
import { SelectorStudioPanelView } from '@/features/selector-studio/components/SelectorStudioPanelView'
import '@/features/selector-studio/i18n'
import type { SelectorStudioModel } from '@/features/selector-studio/useSelectorStudio'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

function renderStudio(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

vi.mock('@/shared/hooks/useDeepLinkTab', async () => {
  const react = await import('react')
  return {
    useDeepLinkTab: (_key: string, _allowed: readonly string[], fallback: string) =>
      react.useState(fallback),
  }
})

const snapshot: SelectorSnapshot = {
  tag: 'button',
  id: 'login-button',
  classes: ['primary'],
  attributes: { 'data-testid': 'submit', type: 'submit' },
  text: 'Submit',
  ownText: 'Submit',
  parentChain: [
    {
      tag: 'form',
      id: 'login-form',
      classes: [],
      attributes: {},
      indexAmongSameTag: 1,
      indexAmongSiblings: 1,
    },
  ],
  indexAmongSameTag: 1,
  indexAmongSiblings: 1,
  label: null,
  previousSibling: null,
  nextSibling: null,
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  isSvg: false,
  connected: true,
  shadowHosts: [],
  frame: { url: 'https://shop.example/checkout', sameOrigin: true, isTop: true },
  identityPath: '/html/body/form[1]/button[1]',
  idUnique: true,
  testIdUnique: true,
  pageUrl: 'https://shop.example/checkout',
}

const recommended: SelectorCandidate = {
  id: 'css:test-attribute:button[data-testid="submit"]',
  kind: 'css',
  strategy: 'test-attribute',
  expression: 'button[data-testid="submit"]',
  context: 'browser',
  uniqueness: 'unique',
  matchCount: 1,
  intendedMatched: true,
  syntaxValid: true,
  score: 88,
  reasons: ['Test attribute data-testid'],
  warnings: [],
}

const xpath: SelectorCandidate = {
  ...recommended,
  id: 'xpath:id://*[@id="login-button"]',
  kind: 'xpath',
  strategy: 'id',
  expression: '//*[@id="login-button"]',
}

function model(partial: Partial<SelectorStudioModel> = {}): SelectorStudioModel {
  return {
    snapshot,
    candidates: [recommended, xpath],
    groups: new Map([
      ['test-attribute', [recommended]],
      ['id', [xpath]],
    ]),
    active: recommended,
    setActive: vi.fn(),
    settings: {
      rankMode: 'stable',
      defaultFramework: 'playwright',
      autoHighlight: false,
      enabled: true,
      livePageSync: true,
    },
    setRankMode: vi.fn(),
    patchSettings: vi.fn(),
    history: [],
    setHistory: vi.fn(),
    pageUrl: snapshot.pageUrl,
    picking: false,
    analyzing: false,
    highlighting: false,
    stale: false,
    error: null,
    matchNotice: '1 matching elements',
    elementInspect: null,
    inspecting: false,
    pick: vi.fn(),
    reanalyze: vi.fn(),
    testCandidate: vi.fn(),
    highlight: vi.fn(),
    clearHighlight: vi.fn(),
    saveActive: vi.fn(),
    validateExpression: vi.fn(),
    updateHistoryEntry: vi.fn(),
    removeHistoryEntry: vi.fn(),
    restoreHistory: vi.fn(),
    clearSelection: vi.fn(),
    inspect: vi.fn(),
    client: {
      kind: 'side-panel',
      resolveTab: vi.fn(),
      startPicker: vi.fn(),
      cancelPicker: vi.fn(),
      readPicked: vi.fn(),
      subscribePicked: () => () => undefined,
      evaluate: vi.fn(),
      highlight: vi.fn(),
      clearHighlights: vi.fn(),
      captureDollarZero: vi.fn(),
      inspectElement: vi.fn(),
      inspectCurrent: vi.fn(),
      onNavigated: () => () => undefined,
      onSelectionChanged: () => () => undefined,
    },
    ...partial,
  }
}

afterEach(cleanup)

describe('Selector Studio UI', () => {
  it('renders hub layout with primary selector and CSS tab', () => {
    renderStudio(<SelectorStudioView model={model()} />)
    expect(screen.getByRole('heading', { name: 'Selector Studio' })).toBeInTheDocument()
    expect(screen.getAllByText('button[data-testid="submit"]').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'CSS' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attributes' })).toBeInTheDocument()
  })

  it('does not show page-validation status when selectors are untested', () => {
    const untested = {
      ...recommended,
      uniqueness: 'unknown' as const,
      matchCount: null,
      intendedMatched: null,
      syntaxValid: null,
    }
    renderStudio(<SelectorStudioView model={model({ active: untested, candidates: [untested] })} pane />)
    expect(screen.queryByText(/could not validate/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/not yet tested/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/could not be verified/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/0 matching elements/i)).not.toBeInTheDocument()
  })

  it('starts the picker from the hub toolbar', async () => {
    const user = userEvent.setup()
    const pick = vi.fn()
    renderStudio(<SelectorStudioView model={model({ pick })} />)
    await user.click(screen.getByRole('button', { name: /pick element/i }))
    expect(pick).toHaveBeenCalled()
  })

  it('switches to XPath and Code tabs', async () => {
    const user = userEvent.setup()
    renderStudio(<SelectorStudioView model={model()} />)
    await user.click(screen.getByRole('tab', { name: 'XPath' }))
    expect(screen.getAllByText('//*[@id="login-button"]').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('tab', { name: 'Code' }))
    expect(screen.getByText('Playwright · getByTestId')).toBeInTheDocument()
  })

  it('highlights from the side rail', async () => {
    const user = userEvent.setup()
    const highlight = vi.fn()
    renderStudio(<SelectorStudioView model={model({ highlight })} />)
    await user.click(screen.getByRole('button', { name: /highlight matches/i }))
    expect(highlight).toHaveBeenCalled()
  })

  it('opens settings in the side panel when the gear is clicked', async () => {
    const user = userEvent.setup()
    renderStudio(<SelectorStudioView model={model()} />)
    await user.click(screen.getByRole('button', { name: /^settings$/i }))
    expect(screen.getByText(/^Rank by$/i)).toBeInTheDocument()
  })

  it('saves history and restores a named locator', async () => {
    const user = userEvent.setup()
    const saveActive = vi.fn()
    const restoreHistory = vi.fn()
    renderStudio(
      <SelectorStudioView
        model={model({
          saveActive,
          restoreHistory,
          history: [
            {
              id: '1',
              at: 1,
              name: 'Checkout submit',
              pageUrl: 'https://shop.example/checkout',
              kind: 'css',
              expression: 'button[data-testid="submit"]',
              strategy: 'test-attribute',
              matchCount: 1,
              uniqueness: 'unique',
            },
          ],
        })}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'History' }))
    expect(screen.getByText('Checkout submit')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(saveActive).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Use' }))
    expect(restoreHistory).toHaveBeenCalled()
  })

  it('opens the playground from the side rail', async () => {
    const user = userEvent.setup()
    renderStudio(<SelectorStudioView model={model()} />)
    await user.click(screen.getByRole('button', { name: /edit selector/i }))
    expect(screen.getByText(/playground/i)).toBeInTheDocument()
  })

  it('works in dark theme and skips motion when reduced-motion is set', () => {
    document.documentElement.classList.add('dark')
    const media = window.matchMedia as unknown as ReturnType<typeof vi.fn>
    media.mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    renderStudio(<SelectorStudioView model={model()} />)
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('heading', { name: 'Selector Studio' })).toBeInTheDocument()
    document.documentElement.classList.remove('dark')
  })

  it('shows pick progress in pane mode', async () => {
    const pick = vi.fn()
    renderStudio(<SelectorStudioView model={model({ picking: true, pick })} pane />)
    expect(screen.getByText(/click an element on the page/i)).toBeInTheDocument()
  })

  it('renders side panel layout with settings in the sidebar', () => {
    renderStudio(<SelectorStudioPanelView model={model()} />)
    expect(screen.getByRole('navigation', { name: /sections/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/studio enabled/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pick element/i })).toBeInTheDocument()
  })

  it('shows computed styles and listeners under Inspect', async () => {
    const user = userEvent.setup()
    renderStudio(
      <SelectorStudioView
        model={model({
          elementInspect: {
            inlineStyle: 'color: red',
            classes: ['primary'],
            computed: [{ name: 'display', value: 'flex' }],
            rules: [{ selector: 'button.primary', cssText: 'color: red', href: 'inline' }],
            listeners: [{ type: 'click', source: 'attribute', count: 1 }],
            box: { width: 80, height: 32, x: 0, y: 0 },
            listenerSource: 'attributes',
          },
        })}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'Inspect' }))
    expect(screen.getByText('button.primary')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Computed' }))
    expect(screen.getByText('display')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Event listeners' }))
    expect(screen.getByText('click')).toBeInTheDocument()
  })
})
