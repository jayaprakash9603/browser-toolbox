import { describe, expect, it } from 'vitest'

import { detectFormat } from '@/core/engines/formatDetect/detectFormat'

describe('detectFormat', () => {
  it('ignores empty input', () => {
    expect(detectFormat('   ')).toBeNull()
  })

  it('detects valid and invalid JSON', () => {
    expect(detectFormat('{"name":"One Panel","enabled":true}')).toMatchObject({
      format: 'json',
      validJson: true,
    })
    expect(detectFormat('[1, 2,')).toMatchObject({ format: 'json', validJson: false })
  })

  it('detects XML, SQL and UUIDs', () => {
    expect(detectFormat('<?xml version="1.0"?><a/>')?.format).toBe('xml')
    expect(detectFormat('select * from users')?.format).toBe('sql')
    expect(detectFormat('123e4567-e89b-12d3-a456-426614174000')?.format).toBe('uuid')
  })

  it('detects regex literals but not plain paths', () => {
    expect(detectFormat('/^a+b$/gi')?.format).toBe('regex')
    expect(detectFormat('/usr/local/bin')?.format).toBeUndefined()
  })

  it('detects YAML conservatively', () => {
    expect(detectFormat('name: Ada\nroles:\n  - dev')?.format).toBe('yaml')
    expect(detectFormat('Note: this is a sentence')?.confidence).toBe('low')
    expect(detectFormat('just a plain sentence without structure')).toBeNull()
  })
})
