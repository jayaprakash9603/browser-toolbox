import type { Note } from './notesService'

export const NOTE_TEMPLATES = ['blank', 'checklist', 'meeting', 'journal', 'page'] as const
export type NoteTemplate = (typeof NOTE_TEMPLATES)[number]

type Translate = (key: string, options?: Record<string, unknown>) => string

export interface PageInfo {
  title: string
  url: string
}

/** Title and body for a new note started from a template. Headings are localized. */
export function templateNote(
  template: NoteTemplate,
  t: Translate,
  { now = new Date(), page }: { now?: Date; page?: PageInfo | null } = {},
): Pick<Note, 'title' | 'body'> {
  const day = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  switch (template) {
    case 'checklist':
      return { title: t('notes.template.checklistTitle'), body: '- [ ] ' }
    case 'meeting':
      return {
        title: t('notes.template.meetingTitle', { date: now.toLocaleDateString() }),
        body: [
          `## ${t('notes.template.attendees')}`,
          '- ',
          '',
          `## ${t('notes.template.agenda')}`,
          '- ',
          '',
          `## ${t('notes.template.discussion')}`,
          '',
          '',
          `## ${t('notes.template.actionItems')}`,
          '- [ ] ',
        ].join('\n'),
      }
    case 'journal':
      return {
        title: day,
        body: [
          `## ${t('notes.template.highlights')}`,
          '- ',
          '',
          `## ${t('notes.template.grateful')}`,
          '- ',
          '',
          `## ${t('notes.template.tomorrow')}`,
          '- [ ] ',
        ].join('\n'),
      }
    case 'page': {
      if (!page) return { title: '', body: '' }
      const label = page.title.trim() || page.url
      return { title: label, body: `[${label.replace(/[[\]]/g, '')}](${page.url})\n\n` }
    }
    default:
      return { title: '', body: '' }
  }
}
