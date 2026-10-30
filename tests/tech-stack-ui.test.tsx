import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TECH_CATEGORIES } from '@/core/engines/techStack/categories'
import type { TechHit } from '@/core/engines/techStack/types'
import { categoryColor, scanAccent } from '@/features/tech-stack/categoryStyle'
import { ScanFooter } from '@/features/tech-stack/components/ScanFooter'
import { TechStackView } from '@/features/tech-stack/components/TechStackView'
import { TechnologiesTab } from '@/features/tech-stack/components/TechnologiesTab'
import '@/features/tech-stack/i18n'

function hit(partial: Partial<TechHit> & Pick<TechHit, 'name' | 'category' | 'evidence'>): TechHit {
  return {
    evidenceItems: [{ type: 'js', detail: partial.evidence }],
    confidence: 0.95,
    confidenceLevel: 'high',
    ...partial,
  }
}

const { scan } = vi.hoisted(() => ({
  scan: {
    url: 'https://example.com/app',
    scannedAt: '2026-10-29T10:00:00.000Z',
    durationMs: 88,
    headersAvailable: true,
    engineVersion: 2,
    hits: [
      {
        name: 'React',
        category: 'js-framework' as const,
        version: '18.2.0',
        evidence: 'js: React.version',
        evidenceItems: [{ type: 'js' as const, detail: 'js: React.version' }],
        confidence: 0.95,
        confidenceLevel: 'high' as const,
        website: 'https://react.dev',
        description: 'A library for building user interfaces from components.',
      },
      {
        name: 'Google Analytics',
        category: 'analytics' as const,
        evidence: 'gtag',
        evidenceItems: [{ type: 'url' as const, detail: 'url: gtag' }],
        confidence: 0.85,
        confidenceLevel: 'high' as const,
        website: 'https://analytics.google.com',
      },
    ],
    facts: {
      title: 'Example',
      description: '',
      language: 'en',
      charset: 'utf-8',
      canonical: '',
      generator: '',
      social: [],
      emails: [],
      phones: [],
      feeds: [],
      counts: { scripts: 4, stylesheets: 2, images: 8, links: 12, forms: 1, iframes: 0 },
    },
    headers: { 'strict-transport-security': 'max-age=31536000' },
    protocol: 'h2',
  },
}))

vi.mock('@/features/tech-stack/useTechScan', () => ({
  useTechScan: () => ({ state: { status: 'ready', scan }, rescan: vi.fn() }),
}))

afterEach(cleanup)

describe('tech stack category colors', () => {
  it('assigns a token color to every known category', () => {
    for (const category of TECH_CATEGORIES) {
      expect(categoryColor(category.id)).toMatch(/^var\(--/)
    }
  })

  it('uses the brand accent while a scan is in flight', () => {
    expect(scanAccent('loading', 0)).toBe('var(--hero-from)')
    expect(scanAccent('error', 0)).toBe('var(--destructive)')
    expect(scanAccent('ready', 0)).toBe('var(--muted-foreground)')
    expect(scanAccent('ready', 3)).toBe('var(--hero-from)')
  })
})

describe('TechStackView', () => {
  it('renders grouped technologies with versions and tabs', () => {
    render(<TechStackView />)

    expect(screen.getByText('example.com')).toBeInTheDocument()
    expect(screen.getByText('2 technologies found')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('18.2.0')).toBeInTheDocument()
    expect(screen.getByText('Google Analytics')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open React website' })).toHaveAttribute('href', 'https://react.dev')
    expect(screen.getByRole('tab', { name: /Technologies/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'More info' })).toBeInTheDocument()
  })

  it('shows scan details on the More info tab', () => {
    render(<TechStackView />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'More info' }))
    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByText('Strict-Transport-Security')).toBeInTheDocument()
    expect(screen.getByText('88 ms')).toBeInTheDocument()
  })

  it('expands a technology row to show evidence', () => {
    render(<TechStackView />)
    fireEvent.click(screen.getByRole('button', { name: 'Show details for React' }))
    expect(screen.getByText('A library for building user interfaces from components.')).toBeInTheDocument()
    expect(screen.getByText('js: React.version')).toBeInTheDocument()
  })

  it('lists CSV and JSON export actions', async () => {
    const user = userEvent.setup()
    render(<ScanFooter canExport showOpen={false} onExportCsv={() => {}} onExportJson={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Export technologies' }))
    expect(await screen.findByRole('menuitem', { name: 'Export as CSV' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Export as JSON' })).toBeInTheDocument()
  })
})

describe('TechnologiesTab', () => {
  it('renders technologies grouped by category', () => {
    render(
      <TechnologiesTab
        hits={[
          hit({ name: 'React', category: 'js-framework', evidence: 'React.version' }),
          hit({ name: 'Vue', category: 'js-framework', evidence: 'Vue.version' }),
        ]}
      />,
    )

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vue')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'JavaScript frameworks' })).toBeInTheDocument()
  })
})
