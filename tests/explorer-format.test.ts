import { describe, expect, it } from 'vitest'

import {
  countEnabledKv,
  explorerEditorLanguage,
  formatExplorerDuration,
  formatExplorerSize,
  protocolFromUrl,
} from '@/tools/api/http-interceptor/explorerFormat'

describe('explorerFormat', () => {
  it('formats duration and size as compact badges', () => {
    expect(formatExplorerDuration(206)).toBe('206 ms')
    expect(formatExplorerDuration(0.4)).toBe('<1 ms')
    expect(formatExplorerDuration(1250)).toBe('1.25 s')
    expect(formatExplorerSize(8120)).toBe('7.9 KB')
    expect(formatExplorerSize(480)).toBe('480 B')
    expect(formatExplorerSize(2_097_152)).toBe('2.0 MB')
  })

  it('reads protocol and enabled query rows', () => {
    expect(protocolFromUrl('https://ep2.adtrafficquality.google/sodar/sodar2.js')).toBe('https')
    expect(protocolFromUrl('http://localhost:5173')).toBe('http')
    expect(protocolFromUrl('not a url')).toBe(null)
    expect(
      countEnabledKv([
        { enabled: true, key: 'client_id' },
        { enabled: false, key: 'skip' },
        { enabled: true, key: '  ' },
      ]),
    ).toBe(1)
  })

  it('picks a pretty-editor language from content type or body', () => {
    expect(explorerEditorLanguage('{}', 'application/json')).toBe('json')
    expect(explorerEditorLanguage('(function(){})();', 'application/javascript')).toBe('javascript')
    expect(explorerEditorLanguage('(function(){ "use strict"; })();')).toBe('javascript')
    expect(explorerEditorLanguage('<html></html>', '', 'html')).toBe('html')
  })
})
