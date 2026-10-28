/** File type from its first bytes ("magic numbers"), independent of the name the file was given. */
export interface FileSignature {
  id: string
  label: string
  /** Extensions this content is normally saved with; empty when any name is plausible. */
  extensions: readonly string[]
  /** Executable or script content that deserves attention when it is disguised. */
  risky?: boolean
}

interface Rule extends FileSignature {
  bytes: readonly (number | null)[]
  offset?: number
}

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))

const ZIP_FAMILY = [
  'zip',
  'docx',
  'xlsx',
  'pptx',
  'odt',
  'ods',
  'odp',
  'epub',
  'jar',
  'apk',
  'aar',
  'xpi',
  'ipa',
  'kmz',
  'vsix',
  'nupkg',
  'whl',
]
const OLE_FAMILY = ['doc', 'xls', 'ppt', 'msi', 'msg', 'vsd', 'pub']
const ISO_MEDIA = ['mp4', 'm4a', 'm4v', 'mov', 'heic', 'heif', 'avif', '3gp', '3g2', 'f4v']

const RULES: readonly Rule[] = [
  {
    id: 'png',
    label: 'PNG image',
    extensions: ['png', 'apng'],
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    id: 'jpeg',
    label: 'JPEG image',
    extensions: ['jpg', 'jpeg', 'jpe', 'jfif'],
    bytes: [0xff, 0xd8, 0xff],
  },
  { id: 'gif', label: 'GIF image', extensions: ['gif'], bytes: ascii('GIF8') },
  {
    id: 'webp',
    label: 'WebP image',
    extensions: ['webp'],
    bytes: [...ascii('RIFF'), null, null, null, null, ...ascii('WEBP')],
  },
  {
    id: 'wav',
    label: 'WAV audio',
    extensions: ['wav'],
    bytes: [...ascii('RIFF'), null, null, null, null, ...ascii('WAVE')],
  },
  {
    id: 'avi',
    label: 'AVI video',
    extensions: ['avi'],
    bytes: [...ascii('RIFF'), null, null, null, null, ...ascii('AVI ')],
  },
  {
    id: 'tiff',
    label: 'TIFF image',
    extensions: ['tif', 'tiff', 'dng', 'cr2', 'nef', 'arw'],
    bytes: [0x49, 0x49, 0x2a, 0x00],
  },
  {
    id: 'tiff-be',
    label: 'TIFF image',
    extensions: ['tif', 'tiff', 'dng', 'nef'],
    bytes: [0x4d, 0x4d, 0x00, 0x2a],
  },
  { id: 'psd', label: 'Photoshop document', extensions: ['psd', 'psb'], bytes: ascii('8BPS') },
  { id: 'ico', label: 'Icon', extensions: ['ico', 'cur'], bytes: [0x00, 0x00, 0x01, 0x00] },
  { id: 'pdf', label: 'PDF document', extensions: ['pdf', 'ai'], bytes: ascii('%PDF-') },
  { id: 'rtf', label: 'Rich Text document', extensions: ['rtf', 'doc'], bytes: ascii('{\\rtf') },
  {
    id: 'zip',
    label: 'ZIP archive (or Office/JAR/APK)',
    extensions: ZIP_FAMILY,
    bytes: [0x50, 0x4b, 0x03, 0x04],
  },
  {
    id: 'zip-empty',
    label: 'ZIP archive (empty)',
    extensions: ZIP_FAMILY,
    bytes: [0x50, 0x4b, 0x05, 0x06],
  },
  {
    id: 'rar',
    label: 'RAR archive',
    extensions: ['rar'],
    bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
  },
  {
    id: '7z',
    label: '7-Zip archive',
    extensions: ['7z'],
    bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
  },
  { id: 'gzip', label: 'Gzip archive', extensions: ['gz', 'tgz', 'gzip'], bytes: [0x1f, 0x8b] },
  { id: 'bzip2', label: 'Bzip2 archive', extensions: ['bz2', 'tbz2'], bytes: ascii('BZh') },
  {
    id: 'xz',
    label: 'XZ archive',
    extensions: ['xz', 'txz'],
    bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00],
  },
  { id: 'zstd', label: 'Zstandard archive', extensions: ['zst'], bytes: [0x28, 0xb5, 0x2f, 0xfd] },
  { id: 'tar', label: 'TAR archive', extensions: ['tar'], bytes: ascii('ustar'), offset: 257 },
  { id: 'woff', label: 'WOFF font', extensions: ['woff'], bytes: ascii('wOFF') },
  { id: 'woff2', label: 'WOFF2 font', extensions: ['woff2'], bytes: ascii('wOF2') },
  { id: 'otf', label: 'OpenType font', extensions: ['otf'], bytes: ascii('OTTO') },
  {
    id: 'ttf',
    label: 'TrueType font',
    extensions: ['ttf', 'ttc'],
    bytes: [0x00, 0x01, 0x00, 0x00, 0x00],
  },
  {
    id: 'ole',
    label: 'Legacy Office / MSI (OLE)',
    extensions: OLE_FAMILY,
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  {
    id: 'sqlite',
    label: 'SQLite database',
    extensions: ['sqlite', 'sqlite3', 'db', 'db3'],
    bytes: ascii('SQLite format 3'),
  },
  {
    id: 'exe',
    label: 'Windows executable (PE)',
    extensions: ['exe', 'dll', 'sys', 'scr', 'com', 'cpl', 'ocx', 'efi', 'mui'],
    bytes: ascii('MZ'),
    risky: true,
  },
  {
    id: 'elf',
    label: 'Linux/Unix executable (ELF)',
    extensions: ['', 'elf', 'so', 'bin', 'o', 'ko', 'out'],
    bytes: [0x7f, ...ascii('ELF')],
    risky: true,
  },
  {
    id: 'macho',
    label: 'macOS executable (Mach-O)',
    extensions: ['', 'dylib', 'bundle', 'o'],
    bytes: [0xcf, 0xfa, 0xed, 0xfe],
    risky: true,
  },
  {
    id: 'macho-32',
    label: 'macOS executable (Mach-O)',
    extensions: ['', 'dylib', 'bundle', 'o'],
    bytes: [0xce, 0xfa, 0xed, 0xfe],
    risky: true,
  },
  {
    id: 'fat',
    label: 'Mach-O universal binary or Java class',
    extensions: ['', 'class', 'dylib'],
    bytes: [0xca, 0xfe, 0xba, 0xbe],
    risky: true,
  },
  {
    id: 'wasm',
    label: 'WebAssembly module',
    extensions: ['wasm'],
    bytes: [0x00, ...ascii('asm')],
    risky: true,
  },
  {
    id: 'dex',
    label: 'Android DEX bytecode',
    extensions: ['dex'],
    bytes: ascii('dex\n'),
    risky: true,
  },
  {
    id: 'lnk',
    label: 'Windows shortcut',
    extensions: ['lnk'],
    bytes: [0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00],
    risky: true,
  },
  {
    id: 'crx',
    label: 'Chrome extension package',
    extensions: ['crx'],
    bytes: ascii('Cr24'),
    risky: true,
  },
  {
    id: 'shebang',
    label: 'Script (#!)',
    extensions: ['', 'sh', 'bash', 'zsh', 'py', 'pl', 'rb', 'js', 'mjs', 'php', 'command'],
    bytes: ascii('#!'),
    risky: true,
  },
  { id: 'mp3', label: 'MP3 audio (ID3)', extensions: ['mp3'], bytes: ascii('ID3') },
  {
    id: 'ogg',
    label: 'Ogg media',
    extensions: ['ogg', 'oga', 'ogv', 'opus'],
    bytes: ascii('OggS'),
  },
  { id: 'flac', label: 'FLAC audio', extensions: ['flac'], bytes: ascii('fLaC') },
  {
    id: 'mkv',
    label: 'Matroska / WebM video',
    extensions: ['mkv', 'webm', 'mka', 'mk3d'],
    bytes: [0x1a, 0x45, 0xdf, 0xa3],
  },
  {
    id: 'iso-media',
    label: 'MP4 / QuickTime / HEIF',
    extensions: ISO_MEDIA,
    bytes: ascii('ftyp'),
    offset: 4,
  },
  {
    id: 'iso9660',
    label: 'Disc image (ISO 9660)',
    extensions: ['iso'],
    bytes: ascii('CD001'),
    offset: 0x8001,
  },
  {
    id: 'pem',
    label: 'PEM key or certificate',
    extensions: ['pem', 'crt', 'cer', 'key', 'csr', 'pub'],
    bytes: ascii('-----BEGIN '),
  },
  {
    id: 'xml',
    label: 'XML document',
    extensions: [
      'xml',
      'svg',
      'xhtml',
      'rss',
      'atom',
      'plist',
      'xsd',
      'xsl',
      'gpx',
      'kml',
      'config',
      'csproj',
    ],
    bytes: ascii('<?xml'),
  },
  // "BM" alone is common text; the reserved header words after the file size must be zero.
  {
    id: 'bmp',
    label: 'BMP image',
    extensions: ['bmp', 'dib'],
    bytes: [...ascii('BM'), null, null, null, null, 0, 0, 0, 0],
  },
]

/** Bytes needed to recognise every rule, including the ISO 9660 volume descriptor. */
export const SIGNATURE_PROBE_BYTES = 0x8001 + 5

const TEXT: FileSignature = { id: 'text', label: 'Plain text', extensions: [] }

/** Extensions only ever used for binary content; a text file wearing one is suspicious. */
const BINARY_EXTENSIONS = new Set(
  RULES.flatMap((rule) => rule.extensions).filter(
    (ext) =>
      ext &&
      ![
        'xml',
        'svg',
        'xhtml',
        'rss',
        'atom',
        'plist',
        'xsd',
        'xsl',
        'gpx',
        'kml',
        'config',
        'csproj',
        'pem',
        'crt',
        'cer',
        'key',
        'csr',
        'pub',
        'sh',
        'bash',
        'zsh',
        'py',
        'pl',
        'rb',
        'js',
        'mjs',
        'php',
        'command',
        'rtf',
        'doc',
      ].includes(ext),
  ),
)

function matches(head: Uint8Array, rule: Rule): boolean {
  const offset = rule.offset ?? 0
  if (head.length < offset + rule.bytes.length) return false
  return rule.bytes.every((byte, i) => byte === null || head[offset + i] === byte)
}

function looksLikeText(head: Uint8Array): boolean {
  const sample = head.subarray(0, 4096)
  if (sample.length === 0) return false
  let control = 0
  for (const byte of sample) {
    if (byte === 0) return false
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) control += 1
  }
  return control / sample.length < 0.02
}

export function detectSignature(head: Uint8Array): FileSignature | null {
  const rule = RULES.find((candidate) => matches(head, candidate))
  if (rule)
    return { id: rule.id, label: rule.label, extensions: rule.extensions, risky: rule.risky }
  return looksLikeText(head) ? TEXT : null
}

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

export type ExtensionVerdict = 'match' | 'mismatch' | 'unknown'

/** Whether the name's extension fits the content. Text content only mismatches binary-only extensions. */
export function checkExtension(name: string, signature: FileSignature | null): ExtensionVerdict {
  if (!signature) return 'unknown'
  const ext = extensionOf(name)
  if (signature.id === TEXT.id) return BINARY_EXTENSIONS.has(ext) ? 'mismatch' : 'match'
  return signature.extensions.includes(ext) ? 'match' : 'mismatch'
}
