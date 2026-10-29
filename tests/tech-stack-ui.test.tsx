import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TECH_CATEGORIES } from '@/core/engines/techStack/categories'
import { categoryColor, scanAccent } from '@/features/tech-stack/categoryStyle'
import { TechStackView } from '@/features/tech-stack/components/TechStackView'
import { TechnologiesTab } from '@/features/tech-stack/components/TechnologiesTab'
import '@/features/tech-stack/i18n'

const { scan } = vi.hoisted(() => ({
  scan: {
    url: 'https://example.com/app',
    scannedAt: '2026-10-29T10:00:00.000Z',
    hits: [
      {
        name: 'React',
        category: 'js-framework',
        version: '18.2.0',
        evidence: 'React.version',
        website: 'https://react.dev',
      },
      { name: 'Google Analytics', category: 'analytics', evidence: 'gtag', website: 'https://analytics.google.com' },
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
  it('renders grouped technologies with versions and category counts', () => {
    render(<TechStackView />)

    expect(screen.getByText('example.com')).toBeInTheDocument()
    expect(screen.getByText('2 technologies found')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('18.2.0')).toBeInTheDocument()
    expect(screen.getByText('Google Analytics')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open React website' })).toHaveAttribute('href', 'https://react.dev')
    expect(screen.getByText('HTTP/2')).toBeInTheDocument()
  })
})

describe('TechnologiesTab', () => {
  it('filters the list from the search field', () => {
    render(
      <TechnologiesTab
        hits={[
          { name: 'React', category: 'js-framework', evidence: 'React.version' },
          { name: 'Vue', category: 'js-framework', evidence: 'Vue.version' },
        ]}
      />,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter technologies…' }), { target: { value: 'vue' } })
    expect(screen.queryByText('React')).not.toBeInTheDocument()
    expect(screen.getByText('Vue')).toBeInTheDocument()
  })
})
