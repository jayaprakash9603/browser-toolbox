import { describe, expect, it } from 'vitest'

import { assessDownload, downloadHost, fileExtension, isRiskyFile } from '@/core/protection/downloads'

const base = { filename: '', url: 'https://site.test/file', mime: '', userInitiated: false, threatCategory: null }

describe('protection download guard', () => {
  it('extracts extensions from Windows and URL paths', () => {
    expect(fileExtension('C:\\Users\\me\\Downloads\\setup.EXE')).toBe('exe')
    expect(fileExtension('report.pdf?x=1')).toBe('pdf')
    expect(fileExtension('.bashrc')).toBe('')
  })

  it('detects executables by extension or mime', () => {
    expect(isRiskyFile('', 'https://x.test/update.msi', '')).toBe(true)
    expect(isRiskyFile('photo.jpg', 'https://x.test/photo.jpg', 'image/jpeg')).toBe(false)
    expect(isRiskyFile('download', 'https://x.test/d', 'application/x-msdownload')).toBe(true)
  })

  it('resolves the origin of blob URLs', () => {
    expect(downloadHost('blob:https://evil.test/1234-abcd')).toBe('evil.test')
    expect(downloadHost('not a url')).toBe('')
  })

  it('blocks anything from a threat host', () => {
    expect(assessDownload({ ...base, filename: 'a.pdf', threatCategory: 'malware', userInitiated: true })).toEqual({
      action: 'block',
      reason: 'threat_host',
    })
  })

  it('asks before keeping executables that started without a click', () => {
    expect(assessDownload({ ...base, filename: 'invoice.exe' }).action).toBe('confirm')
    expect(assessDownload({ ...base, filename: 'invoice.exe', userInitiated: true }).action).toBe('allow')
    expect(assessDownload({ ...base, filename: 'invoice.pdf' }).action).toBe('allow')
  })
})
