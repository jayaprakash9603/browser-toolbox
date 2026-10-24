/** Every PDF Toolkit tool, without icons, so global search can import it cheaply. */

export const CATEGORIES = ['organize', 'optimize', 'to-pdf', 'from-pdf', 'edit', 'security', 'intelligence'] as const
export type Category = (typeof CATEGORIES)[number]

export const TOOL_IDS = [
  'merge',
  'split',
  'remove-pages',
  'extract-pages',
  'organize',
  'scan',
  'compress',
  'repair',
  'jpg-to-pdf',
  'word-to-pdf',
  'powerpoint-to-pdf',
  'excel-to-pdf',
  'html-to-pdf',
  'pdf-to-jpg',
  'pdf-to-word',
  'pdf-to-powerpoint',
  'pdf-to-excel',
  'pdf-to-pdfa',
  'pdf-to-text',
  'view',
  'rotate',
  'page-numbers',
  'watermark',
  'crop',
  'edit',
  'forms',
  'unlock',
  'protect',
  'sign',
  'redact',
  'compare',
  'summarize',
  'translate',
  'pdf-to-markdown',
] as const
export type ToolId = (typeof TOOL_IDS)[number]

export interface ToolInfo {
  id: ToolId
  category: Category
  /** `pdf` tools work on the open document; `files` tools bring their own inputs. */
  input: 'pdf' | 'files'
  /** English name, used when a translation is missing. */
  name: string
  aliases: string[]
}

export const TOOLS: ToolInfo[] = [
  { id: 'merge', category: 'organize', input: 'files', name: 'Merge PDF', aliases: ['combine pdf', 'join pdf', 'merge pdf'] },
  { id: 'split', category: 'organize', input: 'pdf', name: 'Split PDF', aliases: ['split pdf', 'separate pages', 'divide pdf'] },
  { id: 'remove-pages', category: 'organize', input: 'pdf', name: 'Remove pages', aliases: ['delete pdf pages', 'remove pages'] },
  { id: 'extract-pages', category: 'organize', input: 'pdf', name: 'Extract pages', aliases: ['extract pdf pages', 'save pages', 'pick pages'] },
  { id: 'organize', category: 'organize', input: 'pdf', name: 'Organize PDF', aliases: ['reorder pdf', 'sort pages', 'insert blank page', 'move pages'] },
  { id: 'scan', category: 'organize', input: 'files', name: 'Scan to PDF', aliases: ['camera to pdf', 'scan document', 'photo to pdf'] },
  { id: 'compress', category: 'optimize', input: 'pdf', name: 'Compress PDF', aliases: ['reduce pdf size', 'shrink pdf', 'optimize pdf'] },
  { id: 'repair', category: 'optimize', input: 'files', name: 'Repair PDF', aliases: ['fix pdf', 'recover pdf', 'damaged pdf', 'corrupt pdf'] },
  { id: 'jpg-to-pdf', category: 'to-pdf', input: 'files', name: 'JPG to PDF', aliases: ['image to pdf', 'png to pdf', 'photos to pdf'] },
  { id: 'word-to-pdf', category: 'to-pdf', input: 'files', name: 'Word to PDF', aliases: ['docx to pdf', 'doc to pdf'] },
  { id: 'powerpoint-to-pdf', category: 'to-pdf', input: 'files', name: 'PowerPoint to PDF', aliases: ['pptx to pdf', 'slides to pdf', 'ppt to pdf'] },
  { id: 'excel-to-pdf', category: 'to-pdf', input: 'files', name: 'Excel to PDF', aliases: ['xlsx to pdf', 'spreadsheet to pdf'] },
  { id: 'html-to-pdf', category: 'to-pdf', input: 'files', name: 'HTML to PDF', aliases: ['web page to pdf', 'url to pdf', 'website to pdf'] },
  { id: 'pdf-to-jpg', category: 'from-pdf', input: 'pdf', name: 'PDF to JPG', aliases: ['pdf to image', 'pdf to png', 'extract images'] },
  { id: 'pdf-to-word', category: 'from-pdf', input: 'pdf', name: 'PDF to Word', aliases: ['pdf to docx', 'pdf to doc'] },
  { id: 'pdf-to-powerpoint', category: 'from-pdf', input: 'pdf', name: 'PDF to PowerPoint', aliases: ['pdf to pptx', 'pdf to slides'] },
  { id: 'pdf-to-excel', category: 'from-pdf', input: 'pdf', name: 'PDF to Excel', aliases: ['pdf to xlsx', 'pdf table to excel', 'extract tables'] },
  { id: 'pdf-to-pdfa', category: 'from-pdf', input: 'pdf', name: 'PDF to PDF/A', aliases: ['pdfa', 'archive pdf', 'iso 19005'] },
  { id: 'pdf-to-text', category: 'from-pdf', input: 'pdf', name: 'PDF to text', aliases: ['pdf to txt', 'extract text', 'copy pdf text'] },
  { id: 'view', category: 'edit', input: 'pdf', name: 'Read PDF', aliases: ['pdf viewer', 'search pdf', 'pdf properties', 'pdf metadata'] },
  { id: 'rotate', category: 'edit', input: 'pdf', name: 'Rotate PDF', aliases: ['rotate pages', 'turn pdf'] },
  { id: 'page-numbers', category: 'edit', input: 'pdf', name: 'Add page numbers', aliases: ['number pages', 'page numbers', 'paginate'] },
  { id: 'watermark', category: 'edit', input: 'pdf', name: 'Add watermark', aliases: ['watermark pdf', 'stamp pdf', 'confidential'] },
  { id: 'crop', category: 'edit', input: 'pdf', name: 'Crop PDF', aliases: ['trim margins', 'crop pages', 'cut pdf'] },
  { id: 'edit', category: 'edit', input: 'pdf', name: 'Edit PDF', aliases: ['add text to pdf', 'draw on pdf', 'annotate pdf', 'add shapes', 'add image to pdf'] },
  { id: 'forms', category: 'edit', input: 'pdf', name: 'PDF forms', aliases: ['fill pdf form', 'create fillable pdf', 'form fields'] },
  { id: 'unlock', category: 'security', input: 'pdf', name: 'Unlock PDF', aliases: ['remove pdf password', 'decrypt pdf'] },
  { id: 'protect', category: 'security', input: 'pdf', name: 'Protect PDF', aliases: ['password protect', 'encrypt pdf', 'lock pdf'] },
  { id: 'sign', category: 'security', input: 'pdf', name: 'Sign PDF', aliases: ['e-sign', 'signature', 'sign document'] },
  { id: 'redact', category: 'security', input: 'pdf', name: 'Redact PDF', aliases: ['black out text', 'hide sensitive', 'censor pdf'] },
  { id: 'compare', category: 'security', input: 'pdf', name: 'Compare PDF', aliases: ['diff pdf', 'pdf differences', 'compare versions'] },
  { id: 'summarize', category: 'intelligence', input: 'pdf', name: 'AI Summarizer', aliases: ['summarize pdf', 'pdf summary', 'tldr', 'key points'] },
  { id: 'translate', category: 'intelligence', input: 'pdf', name: 'Translate PDF', aliases: ['pdf translator', 'translate document'] },
  { id: 'pdf-to-markdown', category: 'intelligence', input: 'pdf', name: 'PDF to Markdown', aliases: ['pdf to md', 'markdown', 'pdf for llm'] },
]

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((tool) => [tool.id, tool])) as Record<ToolId, ToolInfo>

/** Old deep-link tabs that now live under a different id. */
export const LEGACY_TABS: Record<string, ToolId> = { stamp: 'watermark', convert: 'pdf-to-jpg' }

/** Tools offered next to a finished PDF. */
export const NEXT_STEPS: ToolId[] = ['compress', 'sign', 'watermark', 'page-numbers', 'protect', 'organize', 'split', 'pdf-to-jpg', 'edit', 'summarize']
