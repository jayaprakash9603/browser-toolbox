import { describe, expect, it } from 'vitest'

import { buildChatExportFile, DEFAULT_CHAT_EXPORT_OPTIONS, normalizeMessages } from '@/core/sites/whatsapp/chatExport'

describe('whatsapp chat export', () => {
  it('filters and builds HTML', () => {
    const raw = [
      { fromMe: true, t: 1_700_000_000, body: 'Hi', type: 'chat' },
      { fromMe: false, t: 1_700_000_100, body: 'Call +15551234567', type: 'chat', notifyName: 'Alex' },
    ]
    const opts = { ...DEFAULT_CHAT_EXPORT_OPTIONS, exportParticipantNames: true, redactPhoneNumbers: true }
    const msgs = normalizeMessages(raw, opts, () => 'Alex')
    expect(msgs).toHaveLength(2)
    expect(msgs[1].body).toContain('[number]')
    const file = buildChatExportFile('Team', msgs, opts)
    expect(file.filename).toMatch(/\.html$/)
    expect(file.content).toContain('Team')
  })
})
