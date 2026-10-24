import { cn } from '@/shared/utils/cn'

type Tone = 'pdf' | 'doc' | 'sheet' | 'slide' | 'image' | 'archive' | 'code' | 'data' | 'text' | 'audio' | 'video' | 'binary'

const TONE_CLASSES: Record<Tone, string> = {
  pdf: 'text-rose-500 dark:text-rose-400',
  doc: 'text-blue-600 dark:text-blue-400',
  sheet: 'text-emerald-600 dark:text-emerald-400',
  slide: 'text-orange-500 dark:text-orange-400',
  image: 'text-violet-500 dark:text-violet-400',
  archive: 'text-amber-500 dark:text-amber-400',
  code: 'text-sky-600 dark:text-sky-400',
  data: 'text-teal-600 dark:text-teal-400',
  text: 'text-slate-500 dark:text-slate-400',
  audio: 'text-pink-500 dark:text-pink-400',
  video: 'text-fuchsia-500 dark:text-fuchsia-400',
  binary: 'text-zinc-500 dark:text-zinc-400',
}

const TONE_EXTENSIONS: Record<Tone, string[]> = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'rtf', 'odt', 'pages', 'word'],
  sheet: ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'excel'],
  slide: ['ppt', 'pptx', 'key', 'odp'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'heic', 'tif', 'tiff', 'psd'],
  archive: ['zip', 'gz', 'gzip', 'tgz', '7z', 'rar', 'tar', 'xz', 'bz2'],
  code: ['js', 'ts', 'jsx', 'tsx', 'css', 'html', 'htm', 'py', 'java', 'go', 'rs', 'sql', 'sh', 'php', 'rb', 'c', 'cpp', 'cs'],
  data: ['json', 'yaml', 'yml', 'xml', 'jsonl', 'toml', 'ini', 'env', 'b64', 'base64'],
  text: ['txt', 'md', 'log', 'markdown'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
  video: ['mp4', 'mov', 'webm', 'mkv', 'avi'],
  binary: [],
}

const TONE_BY_EXTENSION = new Map<string, Tone>(
  (Object.entries(TONE_EXTENSIONS) as [Tone, string[]][]).flatMap(([tone, list]) => list.map((ext) => [ext, tone] as const)),
)

function glyphToneClass(extension: string): string {
  return TONE_CLASSES[TONE_BY_EXTENSION.get(extension.toLowerCase()) ?? 'binary']
}

interface FileGlyphProps {
  /** Extension or short label, e.g. "pdf" or "DOCX". */
  extension: string
  className?: string
}

/** Document icon with a colored band showing the file type. */
export function FileGlyph({ extension, className }: FileGlyphProps) {
  const label = (extension || 'file').replace(/^\./, '').toUpperCase().slice(0, 4)
  const fontSize = label.length > 3 ? 7 : 8.5
  return (
    <svg
      viewBox="0 0 40 48"
      aria-hidden
      className={cn('h-10 w-auto shrink-0 drop-shadow-sm', glyphToneClass(extension), className)}
    >
      <path
        d="M7 1.5h19.5L37 12v31.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-39a3 3 0 0 1 3-3Z"
        className="fill-card"
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth={1.25}
      />
      <path d="M7 1.5h19.5L37 12v31.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-39a3 3 0 0 1 3-3Z" fill="currentColor" fillOpacity={0.08} />
      <path d="M26.5 1.5V9a3 3 0 0 0 3 3H37" fill="currentColor" fillOpacity={0.28} stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.25} strokeLinejoin="round" />
      <rect x="9" y="15" width="16" height="2.4" rx="1.2" fill="currentColor" fillOpacity={0.28} />
      <rect x="9" y="20" width="22" height="2.4" rx="1.2" fill="currentColor" fillOpacity={0.2} />
      <rect x="0.5" y="28" width="31" height="13" rx="3.5" fill="currentColor" />
      <text
        x="16"
        y="37.2"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="Inter Variable, Inter, system-ui, sans-serif"
        letterSpacing="0.3"
        fill="#fff"
      >
        {label}
      </text>
    </svg>
  )
}
