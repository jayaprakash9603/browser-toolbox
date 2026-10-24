import { downloadBlob } from '@/features/netmon/download'

import {
  escapeHtml,
  formatTimestamp,
  markdownToHtml,
  markdownToPlain,
  noteDisplayTitle,
  noteToHtmlDocument,
  noteToMarkdown,
  notesToBackup,
  safeFilename,
} from './notesFormat'
import type { Note } from './notesService'

export type NoteExportFormat = 'txt' | 'md' | 'html' | 'doc' | 'pdf'

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function exportNote(note: Note, format: NoteExportFormat, fallbackTitle: string): Promise<void> {
  const title = noteDisplayTitle(note, fallbackTitle)
  const base = safeFilename(title)
  switch (format) {
    case 'txt': {
      const text = note.title.trim() ? `${title}\n\n${note.body}` : note.body
      downloadBlob(new Blob([text.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }), `${base}.txt`)
      return
    }
    case 'md':
      downloadBlob(new Blob([noteToMarkdown(note, title)], { type: 'text/markdown;charset=utf-8' }), `${base}.md`)
      return
    case 'html':
      downloadBlob(new Blob([noteToHtmlDocument(note, title)], { type: 'text/html;charset=utf-8' }), `${base}.html`)
      return
    case 'doc':
      // Word opens HTML saved with a .doc extension and keeps headings, lists and emphasis.
      downloadBlob(
        new Blob(['\ufeff', noteToHtmlDocument(note, title)], { type: 'application/msword' }),
        `${base}.doc`,
      )
      return
    case 'pdf':
      downloadBlob(await noteToPdf(note, title), `${base}.pdf`)
  }
}

async function noteToPdf(note: Note, title: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const left = 48
  const width = doc.internal.pageSize.getWidth() - left * 2
  const bottom = doc.internal.pageSize.getHeight() - 48
  let y = 60

  const write = (text: string, size: number, style: 'normal' | 'bold', gap: number) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const lineHeight = size * 1.35
    for (const line of doc.splitTextToSize(text || ' ', width) as string[]) {
      if (y + lineHeight > bottom) {
        doc.addPage()
        y = 60
      }
      doc.text(line, left, y)
      y += lineHeight
    }
    y += gap
  }

  write(title, 18, 'bold', 2)
  doc.setTextColor(110)
  write(formatTimestamp(new Date(note.updatedAt)), 9, 'normal', 10)
  doc.setTextColor(20)
  const raw = note.body.replace(/\r\n?/g, '\n').split('\n')
  const plain = markdownToPlain(note.body).split('\n')
  let p = 0
  for (const line of raw) {
    if (/^\s*```/.test(line)) continue
    const heading = /^(#{1,6}) /.exec(line)
    const text = plain[p] ?? ''
    p += 1
    if (heading) write(text, Math.max(12, 18 - heading[1].length * 2), 'bold', 4)
    else write(text, 11, 'normal', 0)
  }
  return doc.output('blob')
}

export async function exportAllAsZip(notes: Note[], fallbackTitle: string): Promise<void> {
  const { strToU8, zipSync } = await import('fflate')
  const used = new Set<string>()
  const files: Record<string, Uint8Array> = {}
  for (const note of notes) {
    const title = noteDisplayTitle(note, fallbackTitle)
    let name = safeFilename(title)
    for (let i = 2; used.has(name.toLowerCase()); i += 1) name = `${safeFilename(title)} (${i})`
    used.add(name.toLowerCase())
    files[`${name}.md`] = strToU8(noteToMarkdown(note, title))
  }
  const bytes = zipSync(files)
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }), `notes-${stamp()}.zip`)
}

export function exportBackup(notes: Note[]): void {
  downloadBlob(new Blob([notesToBackup(notes)], { type: 'application/json' }), `notes-backup-${stamp()}.json`)
}

export async function copyNote(note: Note, fallbackTitle: string, rich: boolean): Promise<void> {
  const title = noteDisplayTitle(note, fallbackTitle)
  const text = note.title.trim() ? `${title}\n\n${note.body}` : note.body
  if (rich && typeof ClipboardItem !== 'undefined') {
    const html = `<h1>${escapeHtml(title)}</h1>${markdownToHtml(note.body)}`
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([markdownToPlain(text)], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
    return
  }
  await navigator.clipboard.writeText(text)
}

export function printNote(note: Note, fallbackTitle: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const win = frame.contentWindow
  if (!win) {
    frame.remove()
    return
  }
  win.document.open()
  win.document.write(noteToHtmlDocument(note, noteDisplayTitle(note, fallbackTitle)))
  win.document.close()
  const cleanup = () => setTimeout(() => frame.remove(), 500)
  win.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(cleanup, 60_000)
  }, 50)
}
