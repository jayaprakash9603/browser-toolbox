import { useMemo } from 'react'

export function useTextStats(value: string) {
  return useMemo(() => {
    const trimmed = value.trim()
    return {
      chars: value.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      lines: value ? value.split('\n').length : 0,
    }
  }, [value])
}
