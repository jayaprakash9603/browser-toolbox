import {
  BrushIcon,
  CodeXmlIcon,
  FolderOpenIcon,
  GlobeLockIcon,
  LayoutDashboardIcon,
  type LucideIcon,
} from 'lucide-react'

import type { ToolDefinition } from './types'
import { isWorkspaceChild } from './workspaces'

export interface SectionShortcut {
  toolId: string
  label: string
}

export interface SectionDefinition {
  id: string
  name: string
  description: string
  icon: LucideIcon
  toolIds: string[]
  shortcuts?: SectionShortcut[]
}

export const SECTIONS: SectionDefinition[] = [
  {
    id: 'develop-qa',
    name: 'Develop & QA',
    description: 'Format, inspect, test and debug code, APIs and pages.',
    icon: CodeXmlIcon,
    toolIds: [
      'text.studio',
      'developer.formatter-studio',
      'qa.selector-studio',
      'api.request-builder',
      'api.http-interceptor',
      'qa.test-data-generator',
      'qa.bug-reporter',
      'developer.react-devtools',
      'text.diff',
      'sites.script-studio',
    ],
  },
  {
    id: 'design-accessibility',
    name: 'Design & Accessibility',
    description: 'Colors, palettes, CSS, responsive previews and layout debugging.',
    icon: BrushIcon,
    toolIds: [
      'design.color-picker',
      'design.palette-generator',
      'design.css-color-studio',
      'design.font-inspector',
      'design.responsive-viewer',
      'design.layout-wireframe',
    ],
    shortcuts: [{ toolId: 'accessibility.toolkit', label: 'Accessibility Quick Check' }],
  },
  {
    id: 'web-security',
    name: 'Web & Security',
    description: 'Links, SEO, site technology, scraping and browser protection.',
    icon: GlobeLockIcon,
    toolIds: [
      'web.toolkit',
      'web.tech-stack',
      'web.html-bundle',
      'data.data-scraper',
      'seo.toolkit',
      'web.copy-markdown',
      'privacy.ad-blocker',
      'privacy.web-protection',
    ],
  },
  {
    id: 'productivity-browser',
    name: 'Productivity & Browser',
    description: 'Tabs, notes, tasks, autofill and everyday browser workflow.',
    icon: LayoutDashboardIcon,
    toolIds: [
      'browser.toolkit',
      'browser.internet-monitor',
      'browser.picture-in-picture',
      'datetime.toolkit',
      'productivity.tasks',
      'productivity.notes',
      'productivity.form-autofill',
      'productivity.snippets',
      'productivity.reading-list',
      'clipboard.manager',
      'text.read-aloud',
      'sites.youtube',
      'sites.instagram',
      'sites.twitter',
      'sites.linkedin',
      'sites.whatsapp',
    ],
  },
  {
    id: 'files-media',
    name: 'Files, Media & Utilities',
    description: 'Images, screenshots, recordings, documents, conversions and codes.',
    icon: FolderOpenIcon,
    toolIds: [
      'image.image-toolkit',
      'image.save-as-type',
      'data.universal-converter',
      'security.toolkit',
      'screenshots.capture',
      'screenshots.recorder',
      'files.file-toolkit',
      'files.pdf-toolkit',
      'generators.qr-toolkit',
    ],
  },
]

const SECTION_BY_ID = new Map(SECTIONS.map((section) => [section.id, section]))

const SECTION_BY_TOOL = new Map(
  SECTIONS.flatMap((section) => section.toolIds.map((id) => [id, section] as const)),
)

export function getSection(sectionId: string): SectionDefinition | undefined {
  return SECTION_BY_ID.get(sectionId)
}

export function getSectionForTool(toolId: string): SectionDefinition | undefined {
  return SECTION_BY_TOOL.get(toolId)
}

export function isPrimaryTool(tool: ToolDefinition): boolean {
  return (tool.status ?? 'active') !== 'disabled' && !isWorkspaceChild(tool.id)
}

export const CATEGORY_TO_SECTION: Record<string, string> = {
  clipboard: 'productivity-browser',
  text: 'develop-qa',
  developer: 'develop-qa',
  qa: 'develop-qa',
  api: 'develop-qa',
  web: 'web-security',
  data: 'files-media',
  design: 'design-accessibility',
  security: 'files-media',
  privacy: 'web-security',
  sites: 'productivity-browser',
  calculators: 'files-media',
  datetime: 'productivity-browser',
  screenshots: 'files-media',
  image: 'files-media',
  files: 'files-media',
  generators: 'files-media',
  seo: 'web-security',
  productivity: 'productivity-browser',
  browser: 'productivity-browser',
  storage: 'productivity-browser',
  accessibility: 'design-accessibility',
}
