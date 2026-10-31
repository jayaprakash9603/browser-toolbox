import {
  AlignLeftIcon,
  ArrowLeftRightIcon,
  BinaryIcon,
  CalendarClockIcon,
  CaseSensitiveIcon,
  CodeIcon,
  CrosshairIcon,
  DatabaseIcon,
  DicesIcon,
  FileJsonIcon,
  FileSearchIcon,
  FingerprintIcon,
  GlobeIcon,
  HashIcon,
  ImageDownIcon,
  ImageIcon,
  LayoutGridIcon,
  Link2Icon,
  ListChecksIcon,
  MousePointerClickIcon,
  PaletteIcon,
  RegexIcon,
  ReplaceIcon,
  RouteIcon,
  ScanSearchIcon,
  ShapesIcon,
  SquareCodeIcon,
  TagsIcon,
  TimerIcon,
  UnfoldVerticalIcon,
  WrapTextIcon,
  type LucideIcon,
} from 'lucide-react'

export interface WorkspaceView {
  key: string
  toolId: string
  label: string
  icon?: LucideIcon
}

export interface WorkspaceDefinition {
  id: string
  views: WorkspaceView[]
}

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: 'text.studio',
    views: [
      { key: 'overview', toolId: 'text.studio', label: 'Overview', icon: LayoutGridIcon },
      { key: 'formatter', toolId: 'text.formatter', label: 'Code Formatter', icon: AlignLeftIcon },
      { key: 'case', toolId: 'text.case-converter', label: 'Case Converter', icon: CaseSensitiveIcon },
      { key: 'cleaner', toolId: 'text.whitespace-cleaner', label: 'Text Cleaner', icon: WrapTextIcon },
      { key: 'analyzer', toolId: 'text.analyzer', label: 'Text Analyzer', icon: HashIcon },
      { key: 'lines', toolId: 'text.line-tools', label: 'Line Tools', icon: UnfoldVerticalIcon },
      { key: 'find-replace', toolId: 'text.find-replace', label: 'Find & Replace', icon: ReplaceIcon },
      { key: 'dummy-data', toolId: 'text.dummy-data', label: 'Dummy Data', icon: TagsIcon },
    ],
  },
  {
    id: 'developer.formatter-studio',
    views: [
      { key: 'detect', toolId: 'developer.formatter-studio', label: 'Detect', icon: ScanSearchIcon },
      { key: 'json', toolId: 'developer.json-toolkit', label: 'JSON', icon: FileJsonIcon },
      { key: 'xml', toolId: 'developer.xml-toolkit', label: 'XML', icon: CodeIcon },
      { key: 'yaml', toolId: 'developer.yaml-toolkit', label: 'YAML', icon: SquareCodeIcon },
      { key: 'sql', toolId: 'developer.sql-toolkit', label: 'SQL', icon: DatabaseIcon },
      { key: 'regex', toolId: 'developer.regex-toolkit', label: 'Regex', icon: RegexIcon },
      { key: 'uuid', toolId: 'developer.id-toolkit', label: 'UUID', icon: FingerprintIcon },
    ],
  },
  {
    id: 'qa.selector-studio',
    views: [
      { key: 'studio', toolId: 'qa.selector-studio', label: 'Studio', icon: ScanSearchIcon },
      { key: 'inspector', toolId: 'qa.element-inspector', label: 'Inspector', icon: MousePointerClickIcon },
      { key: 'generator', toolId: 'qa.selector-generator', label: 'Generator', icon: CrosshairIcon },
      { key: 'xpath', toolId: 'qa.xpath-tester', label: 'XPath', icon: ListChecksIcon },
    ],
  },
  {
    id: 'web.toolkit',
    views: [
      { key: 'overview', toolId: 'web.toolkit', label: 'Overview', icon: LayoutGridIcon },
      { key: 'url', toolId: 'web.url-toolkit', label: 'URL Builder', icon: GlobeIcon },
      { key: 'links', toolId: 'web.link-toolkit', label: 'Link Analysis', icon: Link2Icon },
      { key: 'broken', toolId: 'web.link-checker', label: 'Broken Links', icon: FileSearchIcon },
      { key: 'redirects', toolId: 'web.redirect-tracer', label: 'Redirects', icon: RouteIcon },
      { key: 'utm', toolId: 'web.utm-builder', label: 'UTM Builder', icon: TagsIcon },
    ],
  },
  {
    id: 'data.universal-converter',
    views: [
      { key: 'data', toolId: 'data.universal-converter', label: 'Data Formats', icon: ArrowLeftRightIcon },
      { key: 'units', toolId: 'calculators.unit-converter', label: 'Units', icon: ArrowLeftRightIcon },
      { key: 'bases', toolId: 'calculators.base-converter', label: 'Number Bases', icon: BinaryIcon },
    ],
  },
  {
    id: 'design.css-color-studio',
    views: [
      { key: 'overview', toolId: 'design.css-color-studio', label: 'Overview', icon: LayoutGridIcon },
      { key: 'css', toolId: 'design.css-generator', label: 'CSS Generation', icon: ShapesIcon },
      { key: 'contrast', toolId: 'design.contrast-checker', label: 'Contrast', icon: ScanSearchIcon },
      { key: 'color', toolId: 'design.color-converter', label: 'Color Conversion', icon: PaletteIcon },
    ],
  },
  {
    id: 'security.toolkit',
    views: [
      { key: 'overview', toolId: 'security.toolkit', label: 'Overview', icon: LayoutGridIcon },
      { key: 'encode', toolId: 'security.encoder-decoder', label: 'Encode / Decode', icon: BinaryIcon },
      { key: 'hash', toolId: 'security.hash-toolkit', label: 'Hashing', icon: HashIcon },
      { key: 'jwt', toolId: 'security.jwt-toolkit', label: 'JWT', icon: FingerprintIcon },
      { key: 'password', toolId: 'security.password-generator', label: 'Passwords', icon: FingerprintIcon },
      { key: 'random', toolId: 'security.random-generator', label: 'Random', icon: DicesIcon },
    ],
  },
  {
    id: 'datetime.toolkit',
    views: [
      { key: 'datetime', toolId: 'datetime.toolkit', label: 'Date & Time', icon: CalendarClockIcon },
      { key: 'timer', toolId: 'productivity.timer', label: 'Timer', icon: TimerIcon },
    ],
  },
  {
    id: 'browser.toolkit',
    views: [
      { key: 'tabs', toolId: 'productivity.tab-manager', label: 'Tabs', icon: LayoutGridIcon },
      { key: 'sessions', toolId: 'productivity.workspaces', label: 'Sessions', icon: LayoutGridIcon },
      { key: 'bookmarks', toolId: 'productivity.bookmarks', label: 'Bookmarks', icon: TagsIcon },
      { key: 'utilities', toolId: 'browser.toolkit', label: 'Utilities', icon: GlobeIcon },
      { key: 'storage', toolId: 'storage.inspector', label: 'Storage', icon: DatabaseIcon },
      { key: 'accessibility', toolId: 'accessibility.toolkit', label: 'Accessibility', icon: ScanSearchIcon },
      { key: 'page-info', toolId: 'web.page-info', label: 'Page Information', icon: FileSearchIcon },
    ],
  },
  {
    id: 'image.image-toolkit',
    views: [
      { key: 'discovery', toolId: 'web.image-links', label: 'Discovery', icon: ImageIcon },
      { key: 'svg', toolId: 'design.svg-grabber', label: 'SVG', icon: ShapesIcon },
      { key: 'editing', toolId: 'image.image-toolkit', label: 'Editing', icon: ImageIcon },
      { key: 'downloading', toolId: 'image.image-downloader', label: 'Downloading', icon: ImageDownIcon },
    ],
  },
  {
    id: 'browser.internet-monitor',
    views: [
      { key: 'monitor', toolId: 'browser.internet-monitor', label: 'Monitor', icon: GlobeIcon },
      { key: 'speed-test', toolId: 'browser.speed-test', label: 'Speed Test', icon: TimerIcon },
    ],
  },
]

const WORKSPACE_BY_ID = new Map(WORKSPACES.map((workspace) => [workspace.id, workspace]))

const WORKSPACE_BY_MEMBER = new Map(
  WORKSPACES.flatMap((workspace) =>
    workspace.views.map((view) => [view.toolId, workspace] as const),
  ),
)

export function getWorkspace(workspaceId: string): WorkspaceDefinition | undefined {
  return WORKSPACE_BY_ID.get(workspaceId)
}

export function getWorkspaceForTool(toolId: string): WorkspaceDefinition | undefined {
  return WORKSPACE_BY_MEMBER.get(toolId)
}

export function isWorkspaceChild(toolId: string): boolean {
  const workspace = WORKSPACE_BY_MEMBER.get(toolId)
  return workspace !== undefined && workspace.id !== toolId
}
