import {
  AppWindowIcon,
  CalculatorIcon,
  CameraIcon,
  ClipboardIcon,
  CodeIcon,
  FileIcon,
  FlaskConicalIcon,
  GlobeIcon,
  PaletteIcon,
  ShieldIcon,
  TypeIcon,
  ZapIcon,
} from 'lucide-react'

import type { CategoryDefinition } from '@/core/registry'

export const CATEGORIES: CategoryDefinition[] = [
  { id: 'clipboard', name: 'Clipboard', description: 'Clipboard history and management', icon: ClipboardIcon, order: 10, enabled: true },
  { id: 'text', name: 'Text', description: 'Text formatting, conversion and analysis', icon: TypeIcon, order: 20, enabled: true },
  { id: 'developer', name: 'Developer', description: 'JSON, JWT, regex and code utilities', icon: CodeIcon, order: 30, enabled: false },
  { id: 'qa', name: 'QA', description: 'XPath, selectors, element inspection', icon: FlaskConicalIcon, order: 40, enabled: false },
  { id: 'web', name: 'Web', description: 'Links, cookies, storage inspection', icon: GlobeIcon, order: 50, enabled: false },
  { id: 'design', name: 'Design', description: 'Colors, typography, layout helpers', icon: PaletteIcon, order: 60, enabled: false },
  { id: 'security', name: 'Security', description: 'Hashing, encoding, headers', icon: ShieldIcon, order: 70, enabled: false },
  { id: 'calculators', name: 'Calculators', description: 'Date, unit and math calculators', icon: CalculatorIcon, order: 80, enabled: false },
  { id: 'screenshots', name: 'Screenshots', description: 'Capture and annotate pages', icon: CameraIcon, order: 90, enabled: false },
  { id: 'files', name: 'Files', description: 'File conversion and inspection', icon: FileIcon, order: 100, enabled: false },
  { id: 'productivity', name: 'Productivity', description: 'Timers, notes and workflow helpers', icon: ZapIcon, order: 110, enabled: false },
]

export const COMING_SOON_ICON = AppWindowIcon
