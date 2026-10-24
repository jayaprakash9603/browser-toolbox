import { detectDelimiter } from '@/core/engines/csv'

export interface LoadedFile {
  name: string
  size: number
  lastModified: number
  content: string
}

export function splitFileName(name: string): { base: string; extension: string } {
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1
    ? { base: name.slice(0, dot), extension: name.slice(dot + 1).toUpperCase() }
    : { base: name, extension: '' }
}

export function countLines(content: string): number {
  if (!content) return 0
  const lines = content.split(/\r\n|\r|\n/)
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
}

const DELIMITER_NAMES: Record<string, string> = {
  ',': 'Comma',
  '\t': 'Tab',
  ';': 'Semicolon',
  '|': 'Pipe',
}

export function delimiterLabel(content: string): string {
  const delimiter = detectDelimiter(content.split(/\r?\n/, 1)[0] ?? '')
  return DELIMITER_NAMES[delimiter] ?? `"${delimiter}"`
}

export async function readLoadedFile(file: File): Promise<LoadedFile> {
  const raw = await file.text()
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    content: raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw,
  }
}
